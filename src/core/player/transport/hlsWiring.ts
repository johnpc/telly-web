// hls.js event wiring: every track-shaping event refreshes the track
// snapshot + stream details, fatal errors hit the reconnect budget. Split
// from `hlsEngine.ts` so the transport itself stays a lifecycle.
import type Hls from 'hls.js';
import type { ErrorData } from 'hls.js';
import { hlsDetails, mapHlsTracks } from './hlsTracks';
import type { TrackSnapshot } from '../engine/trackModels';
import type { TransportListener } from './transport';

export function hlsErrorMessage(data: ErrorData): string {
  return `${data.type}/${data.details}`;
}

type HlsEvents = typeof Hls.Events;

const TRACK_EVENTS = [
  'MANIFEST_PARSED',
  'LEVEL_SWITCHED',
  'AUDIO_TRACKS_UPDATED',
  'AUDIO_TRACK_SWITCHED',
  'SUBTITLE_TRACKS_UPDATED',
  'SUBTITLE_TRACK_SWITCH',
] as const;

/** Every track-shaping event refreshes the snapshot + details; fatal errors hit the budget. */
export function wireHls(
  hls: Hls,
  events: HlsEvents,
  listener: TransportListener,
  keep: (snapshot: TrackSnapshot) => void,
): void {
  const refresh = (): void => {
    const snapshot = mapHlsTracks(hls);
    keep(snapshot);
    listener.onTracksChanged(snapshot);
    listener.onDetails(hlsDetails(hls));
  };
  for (const name of TRACK_EVENTS) hls.on(events[name], refresh);
  hls.on(events.ERROR, (_event, data) => {
    if (data.fatal) listener.onError(hlsErrorMessage(data));
  });
}
