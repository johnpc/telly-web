import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JUMP_STEP_MS, SEEK_STEP_MS, VodPlayerControls } from './vodPlayerControls';
import { fakeVodEngine, type FakeVodEngine } from './vodTestSupport';
import { VodTransportVisibility } from './vodTransportVisibility';

function controlsOver(): {
  controls: VodPlayerControls;
  engine: FakeVodEngine;
  persisted: number[];
  arm: () => void;
} {
  const engine = fakeVodEngine();
  const persisted: number[] = [];
  const transport = new VodTransportVisibility(() => 5_000);
  let playing = false;
  const controls = new VodPlayerControls(
    engine,
    transport,
    () => persisted.push(engine.positionMs),
    () => playing,
  );
  const arm = (): void => {
    playing = true;
    controls.reveal();
  };
  return { controls, engine, persisted, arm };
}

describe('VodPlayerControls', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("is inert while the stage is not Playing; reveal shows the transport; pause is the engine's flag", () => {
    const { controls, engine, arm } = controlsOver();
    controls.togglePause();
    controls.seekBy(SEEK_STEP_MS);
    expect(engine.calls).toEqual([]);
    arm();
    expect(controls.transport.visible).toBe(true);
    expect(controls.paused).toBe(false);
  });

  it('toggles pause, persisting on pause and keeping the transport up', () => {
    const { controls, engine, persisted, arm } = controlsOver();
    arm();
    engine.positionMs = 7_000;
    controls.togglePause();
    expect(controls.paused).toBe(true);
    expect(engine.calls).toEqual(['pause']);
    expect(persisted).toEqual([7_000]);
    vi.advanceTimersByTime(10_000);
    expect(controls.transport.visible).toBe(true);
    controls.togglePause();
    expect(engine.calls).toEqual(['pause', 'play']);
    vi.advanceTimersByTime(5_000);
    expect(controls.transport.visible).toBe(false);
  });

  it('seeks within 0..duration and samples the clock', () => {
    const { controls, engine, arm } = controlsOver();
    arm();
    engine.durationMs = 30_000;
    engine.positionMs = 5_000;
    controls.seekBy(-SEEK_STEP_MS);
    expect(engine.positionMs).toBe(0);
    controls.seekBy(JUMP_STEP_MS * 2);
    expect(engine.positionMs).toBe(30_000);
    expect(controls.progress).toEqual({ positionMs: 30_000, durationMs: 30_000 });
  });

  it('seeks freely while the duration is unknown and treats Infinity as unknown', () => {
    const { controls, engine, arm } = controlsOver();
    arm();
    engine.durationMs = Number.POSITIVE_INFINITY;
    engine.positionMs = 1_000;
    controls.seekBy(SEEK_STEP_MS);
    expect(engine.positionMs).toBe(11_000);
    expect(controls.durationMs()).toBe(0);
  });

  it('sample notifies only when the reading changed', () => {
    const { controls, engine } = controlsOver();
    let notified = 0;
    controls.subscribe(() => (notified += 1));
    controls.sample();
    engine.positionMs = 500;
    controls.sample();
    controls.sample();
    expect(notified).toBe(1);
    expect(controls.positionMs()).toBe(500);
  });
});
