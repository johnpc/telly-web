import { beforeEach, describe, expect, it, vi } from 'vitest';
import { consoleTelemetryLog, LOG_TAG, PlaybackTelemetry, streamLabel } from './playbackTelemetry';

describe('PlaybackTelemetry', () => {
  let now: number;
  let lines: string[];
  let telemetry: PlaybackTelemetry;

  beforeEach(() => {
    now = 0;
    lines = [];
    telemetry = new PlaybackTelemetry(
      () => now,
      (line) => lines.push(line),
    );
  });

  it("state changes log the previous state's duration and repeats are ignored", () => {
    now = 500;
    telemetry.onState('BUFFERING', 0);
    now = 2_000;
    telemetry.onState('READY/playing', 100);
    telemetry.onState('READY/playing', 200);
    expect(lines).toEqual([
      'state IDLE -> BUFFERING after 500ms at 0ms',
      'state BUFFERING -> READY/playing after 1500ms at 100ms',
    ]);
  });

  it('video that stops rendering while audio advances is reported once, then its recovery', () => {
    telemetry.onLoad('host/…/1.ts');
    telemetry.onVideoFrame();
    telemetry.onSample(true, 1_000, 4_000);
    now = 2_500;
    telemetry.onSample(true, 3_500, 4_000);
    expect(telemetry.frozenSince).toBe(0);
    now = 4_500;
    telemetry.onSample(true, 5_500, 4_000);
    now = 6_000;
    telemetry.onVideoFrame();
    expect(telemetry.frozenSince).toBeNull();
    expect(lines).toEqual([
      'tune host/…/1.ts',
      'VIDEO FROZEN: no frame for 2500ms while audio advances, 4000ms buffered',
      'video resumed after 6000ms frozen',
    ]);
  });

  it('no freeze is reported when paused, when the clock is stuck, or before the first frame', () => {
    telemetry.onLoad('radio');
    now = 5_000;
    telemetry.onSample(true, 5_000, 0);
    telemetry.onVideoFrame();
    now = 9_000;
    telemetry.onSample(false, 6_000, 0);
    telemetry.onSample(true, 6_000, 0);
    expect(lines).toEqual(['tune radio']);
  });

  it('dropped-frame bursts, load errors and notes are logged', () => {
    telemetry.onDroppedFrames(2, 1_000);
    telemetry.onDroppedFrames(12, 1_000);
    telemetry.onLoadError('MEDIA_ERR_NETWORK');
    telemetry.note('engine mpegts');
    expect(lines).toEqual(['dropped 12 frames in 1000ms', 'load error: MEDIA_ERR_NETWORK', 'engine mpegts']);
  });

  it('stream labels keep the host and last segment, never credentials or tokens', () => {
    expect(streamLabel('http://user:pw@iptv.example:8080/live/user/pw/12345.ts?token=abc')).toBe(
      'iptv.example:8080/…/12345.ts',
    );
    expect(streamLabel('https://cdn.example')).toBe('cdn.example');
    expect(streamLabel('')).toBe('');
    expect(streamLabel('radio')).toBe('radio');
  });

  it('the console sink writes under the telly-play tag', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    consoleTelemetryLog('tune x');
    expect(info).toHaveBeenCalledWith(LOG_TAG, 'tune x');
    info.mockRestore();
  });
});
