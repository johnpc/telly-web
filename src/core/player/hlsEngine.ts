// hls.js transport. Levels surface as video renditions, alternate audio /
// subtitle playlists as audio / text tracks; captions start Off like the
// reference. `lowLatencyMode` is off: TiviMate never chases the live edge —
// it just drifts behind — and neither does telly (Android pins live playback
// speed to 1.0× for the same reason). Imported on first use.
import type Hls from 'hls.js';
import type { ErrorData } from 'hls.js';
import type { LoadOptions } from './PlayerEngine';
import { AUDIO_PREFIX, hlsDetails, indexOfId, LEVEL_PREFIX, mapHlsTracks, TEXT_PREFIX } from './hlsTracks';
import { NO_TRACKS, type TrackSnapshot } from './trackModels';
import type { Transport, TransportListener } from './transport';

export type HlsCtor = typeof Hls;
export type HlsLoader = () => Promise<HlsCtor>;

const importHls: HlsLoader = async () => (await import('hls.js')).default;

export function hlsConfig(options: LoadOptions): Partial<Hls['config']> {
  return {
    lowLatencyMode: false,
    enableWorker: true,
    startPosition: options.startPositionMs === undefined ? -1 : options.startPositionMs / 1000,
  };
}

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
function wireHls(
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

export class HlsTransport implements Transport {
  readonly kind = 'hls';
  private hls: Hls | null = null;
  private snapshot: TrackSnapshot = NO_TRACKS;
  private generation = 0;

  constructor(private readonly loadLib: HlsLoader = importHls) {}

  get tracks(): TrackSnapshot {
    return this.snapshot;
  }

  async load(
    video: HTMLVideoElement,
    url: string,
    options: LoadOptions,
    listener: TransportListener,
  ): Promise<void> {
    const generation = ++this.generation;
    const HlsClass = await this.loadLib();
    if (generation !== this.generation) return;
    const hls = new HlsClass(hlsConfig(options));
    wireHls(hls, HlsClass.Events, listener, (snapshot) => {
      this.snapshot = snapshot;
    });
    hls.subtitleDisplay = false;
    hls.loadSource(url);
    hls.attachMedia(video);
    this.hls = hls;
  }

  stop(): void {
    this.generation += 1;
    this.snapshot = NO_TRACKS;
    const hls = this.hls;
    this.hls = null;
    if (hls === null) return;
    hls.stopLoad();
    hls.detachMedia();
    hls.destroy();
  }

  /** null = adaptive "Auto" (-1); hls.js re-emits LEVEL_SWITCHED, refreshing the snapshot. */
  selectVideo(id: string | null): void {
    if (this.hls === null) return;
    const level = id === null ? -1 : indexOfId(id, LEVEL_PREFIX);
    if (level !== null) this.hls.currentLevel = level;
  }

  selectAudio(id: string): void {
    const track = indexOfId(id, AUDIO_PREFIX);
    if (this.hls !== null && track !== null) this.hls.audioTrack = track;
  }

  selectText(id: string | null): void {
    if (this.hls === null) return;
    const track = id === null ? -1 : indexOfId(id, TEXT_PREFIX);
    if (track === null) return;
    this.hls.subtitleTrack = track;
    this.hls.subtitleDisplay = track >= 0;
  }
}
