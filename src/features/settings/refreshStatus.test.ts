import { describe, expect, it } from 'vitest';
import { IDLE, RefreshRunner, type RefreshTimers } from './refreshStatus';

function manualTimers(): RefreshTimers & { fire: () => void } {
  let pending: (() => void) | null = null;
  return {
    set: (callback) => void (pending = callback),
    fire: () => pending?.(),
  };
}

describe('RefreshRunner', () => {
  it('marks the row busy, shows the message, then clears it after the beat', async () => {
    const timers = manualTimers();
    const runner = new RefreshRunner(timers);
    const run = runner.run('row', async () => 'Playlist updated');
    expect(runner.status.value).toEqual({ kind: 'busy', rowId: 'row' });
    expect(runner.busyRowId).toBe('row');
    await run;
    expect(runner.status.value).toEqual({ kind: 'message', text: 'Playlist updated' });
    timers.fire();
    expect(runner.status.value).toBe(IDLE);
    expect(runner.busyRowId).toBeNull();
  });

  it('ignores activations while busy and never strands the spinner on a throw', async () => {
    const timers = manualTimers();
    const runner = new RefreshRunner(timers);
    let release: () => void = () => undefined;
    const first = runner.run('a', () => new Promise<string>((resolve) => (release = () => resolve('done'))));
    await runner.run('b', async () => 'ignored');
    expect(runner.status.value).toEqual({ kind: 'busy', rowId: 'a' });
    release();
    await first;
    expect(runner.status.value).toEqual({ kind: 'message', text: 'done' });
    const stale = runner.status.value;
    await runner.run('c', async () => {
      throw new Error('boom');
    });
    expect(runner.status.value).toEqual({ kind: 'message', text: 'Update failed' });
    timers.fire();
    expect(runner.status.value).toBe(IDLE);
    runner.status.set(stale);
    runner.status.set(stale);
    expect(runner.status.value).toBe(stale);
  });

  it('uses real timers by default', async () => {
    const runner = new RefreshRunner(undefined, 1);
    await runner.run('x', async () => 'ok');
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(runner.status.value).toBe(IDLE);
  });
});
