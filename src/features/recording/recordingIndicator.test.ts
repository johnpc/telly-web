import { describe, expect, it } from 'vitest';
import { isRecording, recordDotLabel } from './recordingIndicator';
import { fakeChannel, fakeRecording } from './recordingTestSupport';

describe('recordingIndicator', () => {
  it('is red only while the given channel has an in-progress recording', () => {
    const rows = [
      fakeRecording({ channelKey: 'news-one.id', status: 'DONE' }),
      fakeRecording({ channelKey: 'sports.id', status: 'RECORDING' }),
    ];
    expect(isRecording(rows, fakeChannel())).toBe(false);
    expect(
      isRecording(
        [...rows, fakeRecording({ channelKey: 'news-one.id', status: 'RECORDING' })],
        fakeChannel(),
      ),
    ).toBe(true);
    expect(isRecording(rows, fakeChannel('Sports', { tvgId: 'sports.id' }))).toBe(true);
    expect(isRecording(rows, null)).toBe(false);
  });

  it('keys channels without a tvg-id by stream url + name', () => {
    const channel = fakeChannel('Raw', { tvgId: null, streamUrl: 'http://x/raw.ts' });
    expect(
      isRecording([fakeRecording({ channelKey: 'http://x/raw.ts|Raw', status: 'RECORDING' })], channel),
    ).toBe(true);
  });

  it('names the dot for assistive tech and the harness', () => {
    expect(recordDotLabel(false)).toBe('Record');
    expect(recordDotLabel(true)).toBe('Recording');
  });
});
