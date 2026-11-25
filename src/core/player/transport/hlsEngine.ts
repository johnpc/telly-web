// hls.js transport. Levels surface as video renditions, alternate audio /
// subtitle playlists as audio / text tracks; captions start Off like the
// reference. `lowLatencyMode` is off: TiviMate never chases the live edge —
// it just drifts behind — and neither does telly (Android pins live playback
// speed to 1.0× for the same reason). The buffer gate is attached per tune
// like every transport: hls.js keeps filling its own buffer (`maxBufferLength`
// is untouched, far above any runway) while the gate only decides when the
// element may play; a live playlist buffered to its edge counts as "all the
// runway there is", so the gate never waits past what the edge can give.
// Imported on first use.
import type Hls from 'hls.js';
import type { LoadOptions } from '../engine/PlayerEngine';
import { attachBufferGate } from '../gate/bufferGate';
import { AUDIO_PREFIX, indexOfId, LEVEL_PREFIX, TEXT_PREFIX } from './hlsTracks';
import { wireHls } from './hlsWiring';
import { NO_TRACKS, type TrackSnapshot } from '../engine/trackModels';
import type { Transport, TransportListener } from './transport';

export { hlsErrorMessage } from './hlsWiring';

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

export class HlsTransport implements Transport {
  readonly kind = 'hls';
  private hls: Hls | null = null;
  private snapshot: TrackSnapshot = NO_TRACKS;
  private detachGate: () => void = () => undefined;
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
    this.detachGate = attachBufferGate(video, options).detach;
  }

  stop(): void {
    this.generation += 1;
    this.snapshot = NO_TRACKS;
    this.detachGate();
    this.detachGate = () => undefined;
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
