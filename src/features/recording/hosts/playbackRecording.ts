import type { ChannelRow } from '@/core/db/types';
import type { PlaybackOverlay } from '@/features/playback/overlay/playbackOverlay';
import type { RecordingCenter } from '../recordingCenter';
import { RecordingMenu } from '../recordingMenu';
import type { RecordingPrompt } from '../recordingPrompt';
import { recordingCenter } from '../recordingRuntime';

export interface PlaybackRecordingDeps {
  /** Shows a sticky overlay through the one `PlaybackCommands` executor. */
  show: (overlay: PlaybackOverlay) => void;
  overlay: () => PlaybackOverlay;
  /** The tuned channel (the transport record dot's target). */
  current: () => ChannelRow | null;
  center?: RecordingCenter;
  clock?: () => number;
}

/**
 * The playback host's DVR surface (Android `PlaybackRecord` +
 * `PlaybackRecordingPrompts`): the context sheet's Record rows act through
 * `menu`, the transport record dot `toggle`s instant record — the exact
 * action behind the sheet's Record row — and prompts map onto overlays:
 * completed actions dismiss the sheet like the favorites/hide rows do, the
 * Stop confirm and the custom form ride the pushed-overlay BACK chain.
 */
export interface PlaybackRecording {
  menu: RecordingMenu;
  onRecord(channel: ChannelRow): void;
  onCustomRecording(channel: ChannelRow): void;
  /** The record dot: start instant record, or offer Stop while recording. */
  toggle(): void;
  confirmStop(recordingId: number): void;
}

/** Where a completed DVR action lands: the panel under a sheet, else bare playback. */
export function doneTarget(overlay: PlaybackOverlay): PlaybackOverlay {
  if (overlay.kind === 'ChannelMenu' || overlay.kind === 'Panel') return { kind: 'Panel' };
  if ('back' in overlay) return doneTarget(overlay.back);
  return { kind: 'None' };
}

export function overlayFor(prompt: RecordingPrompt, current: PlaybackOverlay): PlaybackOverlay {
  switch (prompt.kind) {
    case 'Done':
      return doneTarget(current);
    case 'StopConfirm':
      return {
        kind: 'RecordingStop',
        recordingId: prompt.recordingId,
        channelName: prompt.channelName,
        back: doneTarget(current),
      };
    case 'CustomForm':
      return { kind: 'CustomRecording', form: prompt.form, back: current };
  }
}

export function createPlaybackRecording(deps: PlaybackRecordingDeps): PlaybackRecording {
  const menu = new RecordingMenu({
    center: deps.center ?? recordingCenter,
    clock: deps.clock ?? ((): number => Date.now()),
    show: (prompt) => deps.show(overlayFor(prompt, deps.overlay())),
  });
  return {
    menu,
    onRecord: (channel) => menu.onRecord(channel),
    onCustomRecording: (channel) => menu.onCustomRecording(channel),
    toggle: () => {
      const channel = deps.current();
      if (channel !== null) menu.onRecord(channel);
    },
    confirmStop: (recordingId) => menu.confirmStop(recordingId),
  };
}
