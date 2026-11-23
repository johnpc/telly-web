import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VodPlaybackViewModel } from './vodPlaybackViewModel';
import { fakeVodDeps } from './vodTestSupport';

const flush = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(0);
};

async function started(
  deps = fakeVodDeps(),
  itemKey = 'bunny',
): Promise<{ vm: VodPlaybackViewModel; deps: ReturnType<typeof fakeVodDeps>; exits: number[] }> {
  const exits: number[] = [];
  const vm = new VodPlaybackViewModel(deps, itemKey, () => exits.push(deps.now));
  await vm.start();
  return { vm, deps, exits };
}

describe('VodPlaybackViewModel', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('no stored position plays from the start with the transport visible', async () => {
    const { vm, deps } = await started();
    expect(vm.item?.name).toBe('bunny');
    expect(vm.stage).toEqual({ kind: 'Playing' });
    expect(deps.engine.calls).toEqual(['load:http://x/bunny.mp4@0']);
    expect(vm.controls.transport.visible).toBe(true);
  });

  it('a stored mid-watch position offers resume and loads from it on Resume', async () => {
    const deps = fakeVodDeps();
    deps.rows.set('bunny', { itemKey: 'bunny', positionMs: 12_000, durationMs: 30_000, updatedAtMs: 0 });
    const { vm } = await started(deps);
    expect(vm.stage).toEqual({ kind: 'ResumePrompt', positionMs: 12_000 });
    expect(deps.engine.calls).toEqual([]);
    vm.resumeStored();
    expect(vm.stage).toEqual({ kind: 'Playing' });
    expect(deps.engine.calls).toEqual(['load:http://x/bunny.mp4@12000']);
  });

  it('Start over plays from the beginning instead', async () => {
    const deps = fakeVodDeps();
    deps.rows.set('bunny', { itemKey: 'bunny', positionMs: 12_000, durationMs: 30_000, updatedAtMs: 0 });
    const { vm } = await started(deps);
    vm.startOver();
    expect(deps.engine.calls).toEqual(['load:http://x/bunny.mp4@0']);
  });

  it('positions outside the resume band and remember-off skip the prompt', async () => {
    const early = fakeVodDeps();
    early.rows.set('bunny', { itemKey: 'bunny', positionMs: 100, durationMs: 30_000, updatedAtMs: 0 });
    expect((await started(early)).vm.stage).toEqual({ kind: 'Playing' });
    const off = fakeVodDeps();
    off.rows.set('bunny', { itemKey: 'bunny', positionMs: 12_000, durationMs: 30_000, updatedAtMs: 0 });
    off.remember = false;
    expect((await started(off)).vm.stage).toEqual({ kind: 'Playing' });
  });

  it('exit persists the position once and pops the route', async () => {
    const { vm, deps, exits } = await started();
    deps.engine.positionMs = 4_000;
    deps.engine.durationMs = 30_000;
    await vm.exit();
    await vm.exit();
    expect(deps.rows.get('bunny')?.positionMs).toBe(4_000);
    expect(exits).toEqual([1_000]);
  });

  it('BACK on the resume prompt leaves without writing', async () => {
    const deps = fakeVodDeps();
    deps.rows.set('bunny', { itemKey: 'bunny', positionMs: 12_000, durationMs: 30_000, updatedAtMs: 0 });
    const { vm, exits } = await started(deps);
    await vm.exit();
    expect(exits.length).toBe(1);
    expect(deps.rows.get('bunny')?.positionMs).toBe(12_000);
  });

  it('samples the clock every half second and persists every ten seconds', async () => {
    const { vm, deps } = await started();
    deps.engine.durationMs = 30_000;
    deps.engine.positionMs = 2_000;
    vi.advanceTimersByTime(500);
    expect(vm.controls.progress).toEqual({ positionMs: 2_000, durationMs: 30_000 });
    expect(deps.rows.size).toBe(0);
    await vi.advanceTimersByTimeAsync(9_500);
    expect(deps.rows.get('bunny')?.positionMs).toBe(2_000);
  });

  it('media end clears the position as finished and exits the route', async () => {
    const { vm, deps, exits } = await started();
    deps.engine.durationMs = 30_000;
    deps.rows.set('bunny', { itemKey: 'bunny', positionMs: 1, durationMs: 30_000, updatedAtMs: 0 });
    deps.engine.setState({ kind: 'Buffering' });
    deps.engine.setState({ kind: 'Ended' });
    await flush();
    expect(deps.rows.has('bunny')).toBe(false);
    expect(exits.length).toBe(1);
    vm.release();
  });

  it('a vanished item key just leaves the route', async () => {
    const { vm, exits, deps } = await started(fakeVodDeps(), 'missing');
    expect(exits.length).toBe(1);
    expect(vm.item).toBeNull();
    expect(deps.engine.calls).toEqual([]);
  });

  it('release stops the loops and the engine; a released model never loads or pops', async () => {
    const { vm, deps, exits } = await started();
    vm.release();
    expect(deps.engine.calls).toEqual(['load:http://x/bunny.mp4@0', 'release']);
    vi.advanceTimersByTime(20_000);
    expect(deps.rows.size).toBe(0);
    vm.startOver();
    await vm.exit();
    expect(deps.engine.calls.length).toBe(2);
    expect(exits).toEqual([]);
  });

  it('forwards control and transport changes to its own subscribers', async () => {
    const { vm } = await started();
    const before = vm.version;
    let notified = 0;
    vm.subscribe(() => (notified += 1));
    vm.controls.togglePause();
    vi.advanceTimersByTime(6_000);
    expect(notified).toBeGreaterThan(0);
    expect(vm.version - before).toBe(notified);
    vm.release();
  });
});
