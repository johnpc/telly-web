import { type EngineState, type StreamDetails, useEngineState, useHeldFrame, useRunway } from '@/core/player';
import type { ChannelRow } from '@/core/db/types';
import { useCatchupInfo } from '@/features/catchup';
import { playbackGate } from '../gate/playbackGate';
import type { ClockStyle } from '../info/clockStyle';
import type { PlaybackInfoData } from '../info/playbackInfo';
import type { RecentCard } from '../info/recentCards';
import { usePlaybackInfo } from '../info/usePlaybackInfo';
import { type PanelStyle, useClockStyle, usePanelStyle } from '../info/usePlayerSettings';
import { useRecentCards } from '../info/useRecentCards';
import { useStreamDetails } from '../info/useStreamDetails';
import type { PlaybackOverlay } from '../overlay/playbackOverlay';
import type { PlaybackController } from '../playbackController';
import type { TrackSource } from '../tracks/trackPickerRows';
import { useTrackSource } from '../tracks/useTrackSource';
import type { PlaybackSession } from '../tune/usePlaybackSession';
import { useGatePrompt, useInstant, useNumberDigits, useOverlay } from '../usePlaybackStores';
import { type ZapWaitView, zapWaitOf } from './zapWait';

/** Everything the chrome renders, read from the controller's stores and the live queries in one place. */
export interface PlaybackView {
  overlay: PlaybackOverlay;
  prompt: ChannelRow | null;
  digits: string | null;
  instant: number;
  state: EngineState;
  clock: ClockStyle;
  panelStyle: PanelStyle;
  channel: ChannelRow | null;
  details: StreamDetails | null;
  info: PlaybackInfoData | null;
  recents: RecentCard[];
  source: TrackSource;
  /** The wait for a tune's runway: held frame or channel card + "Buffering · 3 s of 6 s". */
  zapWait: ZapWaitView;
}

export function usePlaybackView(session: PlaybackSession, ctl: PlaybackController): PlaybackView {
  const { engine } = session;
  const overlay = useOverlay(ctl.overlays);
  const instant = useInstant(ctl.instant);
  const clock = useClockStyle();
  const channel = session.playing?.channel ?? null;
  const details = useStreamDetails(engine, overlay.kind !== 'None');
  const state = useEngineState(engine);
  return {
    overlay,
    instant,
    clock,
    channel,
    details,
    state,
    prompt: useGatePrompt(playbackGate.gate),
    digits: useNumberDigits(ctl.entry),
    zapWait: zapWaitOf(state, useRunway(engine), useHeldFrame(engine), channel),
    panelStyle: usePanelStyle(),
    info: useCatchupInfo(ctl.catchup, usePlaybackInfo(channel, instant, details, clock), clock),
    recents: useRecentCards(session.channels, channel?.id ?? null, instant, clock),
    source: useTrackSource(engine, details, ctl.tracksChanged),
  };
}

/** The chrome root's DOM data attributes (what the acceptance harness reads). */
export function chromeAttrs(view: PlaybackView): Record<string, string | undefined> {
  return {
    'data-testid': 'playback-chrome',
    'data-overlay': view.overlay.kind,
    'data-prompt': view.prompt === null ? undefined : 'pin',
  };
}
