import { describe, expect, it } from 'vitest';
import { VodPositionStore } from './vodPositionStore';
import { fakeVodDeps } from './vodTestSupport';

function storeOver(deps = fakeVodDeps()): { store: VodPositionStore; deps: ReturnType<typeof fakeVodDeps> } {
  return { store: new VodPositionStore(deps.positions, deps.rememberPosition, deps.clock), deps };
}

describe('VodPositionStore', () => {
  it('saves a mid-watch position stamped with the clock', async () => {
    const { store, deps } = storeOver();
    await store.save('bunny', 4_000, 30_000);
    expect(deps.rows.get('bunny')).toEqual({
      itemKey: 'bunny',
      positionMs: 4_000,
      durationMs: 30_000,
      updatedAtMs: 1_000,
    });
    expect(await store.read('bunny')).not.toBeNull();
  });

  it('neither reads nor writes while remember is off', async () => {
    const { store, deps } = storeOver();
    deps.rows.set('bunny', { itemKey: 'bunny', positionMs: 1, durationMs: 10, updatedAtMs: 0 });
    deps.remember = false;
    expect(await store.read('bunny')).toBeNull();
    await store.save('bunny', 5, 10);
    expect(deps.rows.get('bunny')?.positionMs).toBe(1);
  });

  it('never persists an unknown duration', async () => {
    const { store, deps } = storeOver();
    await store.save('bunny', 5_000, 0);
    expect(deps.rows.size).toBe(0);
  });

  it('clears the row once finished, including at media end', async () => {
    const { store, deps } = storeOver();
    await store.save('bunny', 1_000, 30_000);
    await store.save('bunny', 29_000, 30_000);
    expect(deps.rows.has('bunny')).toBe(false);
    await store.save('bunny', 1_000, 30_000);
    await store.finish('bunny', 30_000);
    expect(deps.rows.has('bunny')).toBe(false);
  });
});
