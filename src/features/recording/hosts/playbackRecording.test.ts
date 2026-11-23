import { describe, expect, it, vi } from 'vitest';
import type { PlaybackOverlay } from '@/features/playback/overlay/playbackOverlay';
import type { RecordingCenter } from '../recordingCenter';
import { fakeChannel } from '../recordingTestSupport';
import { createPlaybackRecording, doneTarget, overlayFor } from './playbackRecording';

const NONE: PlaybackOverlay = { kind: 'None' };
const PANEL: PlaybackOverlay = { kind: 'Panel' };
const SHEET: PlaybackOverlay = { kind: 'ChannelMenu', channelId: 1 };

describe('playback recording prompts', () => {
  it('a completed action lands on the panel under a sheet, else on bare playback', () => {
    expect(doneTarget(SHEET)).toEqual(PANEL);
    expect(doneTarget(PANEL)).toEqual(PANEL);
    expect(doneTarget({ kind: 'ComingSoon', feature: 'x', back: SHEET })).toEqual(PANEL);
    expect(doneTarget({ kind: 'InfoTransport' })).toEqual(NONE);
    expect(doneTarget({ kind: 'Description', channel: fakeChannel(), back: NONE })).toEqual(NONE);
  });

  it('maps every prompt onto an overlay', () => {
    expect(overlayFor({ kind: 'Done' }, SHEET)).toEqual(PANEL);
    expect(
      overlayFor({ kind: 'StopConfirm', recordingId: 4, channelName: 'News One' }, { kind: 'InfoTransport' }),
    ).toEqual({
      kind: 'RecordingStop',
      recordingId: 4,
      channelName: 'News One',
      back: NONE,
    });
    expect(overlayFor({ kind: 'CustomForm' }, SHEET)).toEqual({ kind: 'CustomRecording', back: SHEET });
  });
});

describe('createPlaybackRecording', () => {
  function rig(current = fakeChannel()): {
    shown: PlaybackOverlay[];
    center: {
      toggleInstant: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
      scheduleProgramme: ReturnType<typeof vi.fn>;
    };
    record: ReturnType<typeof createPlaybackRecording>;
  } {
    const shown: PlaybackOverlay[] = [];
    const center = {
      toggleInstant: vi.fn().mockResolvedValue({ kind: 'Done' }),
      stop: vi.fn().mockResolvedValue(undefined),
      scheduleProgramme: vi.fn().mockResolvedValue({ kind: 'Done' }),
    };
    const record = createPlaybackRecording({
      show: (overlay) => void shown.push(overlay),
      overlay: () => SHEET,
      current: () => current,
      center: center as unknown as RecordingCenter,
      clock: () => 1_000_000,
    });
    return { shown, center, record };
  }

  it('the sheet rows and the transport dot act on the DVR facade and show the mapped overlay', async () => {
    const { shown, center, record } = rig();
    record.onRecord(fakeChannel('Sports'));
    record.toggle();
    await vi.waitFor(() => expect(shown).toEqual([PANEL, PANEL]));
    expect(center.toggleInstant.mock.calls.map(([channel]) => channel.name)).toEqual(['Sports', 'News One']);
    record.onCustomRecording(fakeChannel());
    expect(shown[2]).toEqual({ kind: 'CustomRecording', back: SHEET });
    expect(record.menu.form?.channel.name).toBe('News One');
    record.confirmStop(9);
    await vi.waitFor(() => expect(center.stop).toHaveBeenCalledWith(9));
  });

  it('the dot does nothing while no channel is tuned', () => {
    const { center, record } = rig(null as unknown as ReturnType<typeof fakeChannel>);
    record.toggle();
    expect(center.toggleInstant).not.toHaveBeenCalled();
  });
});
