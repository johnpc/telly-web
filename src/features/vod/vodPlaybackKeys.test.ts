import { describe, expect, it } from 'vitest';
import { onVodPlaybackKey } from './vodPlaybackKeys';
import { JUMP_STEP_MS, SEEK_STEP_MS, VodPlayerControls } from './vodPlayerControls';
import { fakeVodEngine } from './vodTestSupport';
import { VodTransportVisibility } from './vodTransportVisibility';

describe('onVodPlaybackKey', () => {
  it('maps OK/Play-Pause to pause, LEFT/RIGHT and RW/FF to seeks, UP/DOWN to the transport', () => {
    const engine = fakeVodEngine();
    engine.durationMs = 600_000;
    const transport = new VodTransportVisibility(() => 5_000);
    const controls = new VodPlayerControls(engine, transport, () => undefined);
    controls.begin();
    expect(onVodPlaybackKey('RIGHT', controls)).toBe(true);
    expect(engine.positionMs).toBe(SEEK_STEP_MS);
    expect(onVodPlaybackKey('FAST_FORWARD', controls)).toBe(true);
    expect(engine.positionMs).toBe(SEEK_STEP_MS + JUMP_STEP_MS);
    expect(onVodPlaybackKey('REWIND', controls)).toBe(true);
    expect(onVodPlaybackKey('LEFT', controls)).toBe(true);
    expect(engine.positionMs).toBe(0);
    expect(onVodPlaybackKey('OK', controls)).toBe(true);
    expect(controls.paused).toBe(true);
    expect(onVodPlaybackKey('PLAY_PAUSE', controls)).toBe(true);
    expect(controls.paused).toBe(false);
    transport.dispose();
    expect(onVodPlaybackKey('UP', controls)).toBe(true);
    expect(onVodPlaybackKey('DOWN', controls)).toBe(true);
    expect(transport.visible).toBe(true);
    transport.dispose();
  });

  it('leaves BACK, MENU and digits unhandled', () => {
    const controls = new VodPlayerControls(
      fakeVodEngine(),
      new VodTransportVisibility(() => 1),
      () => undefined,
    );
    expect(onVodPlaybackKey('BACK', controls)).toBe(false);
    expect(onVodPlaybackKey('MENU', controls)).toBe(false);
    expect(onVodPlaybackKey({ kind: 'DIGIT', digit: 3 }, controls)).toBe(false);
  });
});
