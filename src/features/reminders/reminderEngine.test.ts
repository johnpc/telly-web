import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReminderRepository } from '@/core/db/reminderRepository';
import { freshDb } from '@/test/dbFixtures';
import { MINUTE_MS } from './reminderDue';
import { ReminderEngine, createReminderEngine } from './reminderEngine';

describe('ReminderEngine', () => {
  let store: ReminderRepository;
  let now: number;
  const onDue = vi.fn();

  beforeEach(() => {
    store = new ReminderRepository(freshDb());
    now = 100 * MINUTE_MS;
    onDue.mockReset();
  });

  const engine = (): ReminderEngine =>
    new ReminderEngine({ store, clock: () => now, leadMinutes: () => 5, onDue });

  it('fires a due reminder exactly once, persisting the claim before the popup, then deletes it', async () => {
    const id = await store.upsert({
      channelId: 1,
      title: 'Show',
      startMs: now + 4 * MINUTE_MS,
      stopMs: now + 60 * MINUTE_MS,
    });
    const sweeper = engine();
    const markFired = vi.spyOn(store, 'markFired');
    await sweeper.tick();
    expect(markFired).toHaveBeenCalledWith(id, now);
    expect(onDue).toHaveBeenCalledTimes(1);
    expect(onDue.mock.calls[0]?.[0]).toMatchObject({ id, title: 'Show' });
    expect(await store.upcoming()).toEqual([]);
    await sweeper.tick();
    expect(onDue).toHaveBeenCalledTimes(1);
  });

  it('leaves pending reminders alone and drops expired or already-claimed rows silently', async () => {
    await store.upsert({
      channelId: 1,
      title: 'Later',
      startMs: now + 30 * MINUTE_MS,
      stopMs: now + 60 * MINUTE_MS,
    });
    await store.upsert({
      channelId: 1,
      title: 'Ended',
      startMs: now - 60 * MINUTE_MS,
      stopMs: now - MINUTE_MS,
    });
    await store.upsert({
      channelId: 1,
      title: 'Claimed',
      startMs: now - MINUTE_MS,
      stopMs: now + MINUTE_MS,
      firedAtMs: 5,
    });
    await engine().tick();
    expect(onDue).not.toHaveBeenCalled();
    expect((await store.upcoming()).map((row) => row.title)).toEqual(['Later']);
  });

  it('does not fire when another sweep already claimed the row, and forgets handled ids of deleted rows', async () => {
    const id = await store.upsert({ channelId: 1, title: 'Show', startMs: now, stopMs: now + MINUTE_MS });
    const rows = await store.upcoming();
    await store.markFired(id, now - 1);
    const sweeper = engine();
    await sweeper.sweep(rows);
    expect(onDue).not.toHaveBeenCalled();
    await store.remove(id);
    await sweeper.sweep([]);
    const again = await store.upsert({ channelId: 1, title: 'Show', startMs: now, stopMs: now + MINUTE_MS });
    await sweeper.tick();
    expect(onDue).toHaveBeenCalledTimes(1);
    expect(onDue.mock.calls[0]?.[0]).toMatchObject({ id: again });
  });

  it('builds over the default store and wall clock', () => {
    expect(createReminderEngine({ onDue, leadMinutes: () => 5 })).toBeInstanceOf(ReminderEngine);
  });
});
