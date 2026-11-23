// mpegts.js transport: raw MPEG-TS over HTTP (the IPTV default) demuxed in a
// worker and fed to MSE. The fixture channels are `.ts` FILES served with
// Range support, so a HEAD probe decides the mode: a Content-Length means a
// finite file (`isLive: false`, seekable); chunked / no length means a live
// pipe (`isLive: true`, no latency chasing — see mpegtsConfig). `lazyLoad` is off so a file keeps
// streaming like a channel instead of pausing its download. The library is
// imported on first use so the bundle stays small.
import type Mpegts from 'mpegts.js';
import type { LoadOptions } from './PlayerEngine';
import { attachBufferGate, thresholdsFor } from './bufferGate';
import {
  detailsOf,
  isLivePipe,
  mpegtsConfig,
  mpegtsErrorMessage,
  type MpegtsErrorInfo,
} from './mpegtsConfig';
import { NO_TRACKS, type TrackSnapshot } from './trackModels';
import type { Transport, TransportListener } from './transport';
import type { UrlProbe } from './urlProbe';
import { probeUrl } from './urlProbe';

export type MpegtsModule = typeof Mpegts;
export type MpegtsLoader = () => Promise<MpegtsModule>;

const importMpegts: MpegtsLoader = async () => (await import('mpegts.js')).default;

function wireMpegts(player: Mpegts.Player, events: Mpegts.Events, listener: TransportListener): void {
  player.on(events.ERROR, (type: string, detail: string, info?: MpegtsErrorInfo) =>
    listener.onError(mpegtsErrorMessage(type, detail, info)),
  );
  player.on(events.MEDIA_INFO, (info: Mpegts.MSEPlayerMediaInfo) => listener.onDetails(detailsOf(info)));
}

function startPlayer(
  lib: MpegtsModule,
  video: HTMLVideoElement,
  url: string,
  isLive: boolean,
  options: LoadOptions,
  listener: TransportListener,
): Mpegts.Player {
  const player = lib.createPlayer({ type: 'mpegts', url, isLive, cors: true }, mpegtsConfig(isLive));
  wireMpegts(player, lib.Events, listener);
  player.attachMediaElement(video);
  player.load();
  if (!isLive && options.startPositionMs !== undefined) player.currentTime = options.startPositionMs / 1000;
  return player;
}

export class MpegtsTransport implements Transport {
  readonly kind = 'mpegts';
  readonly tracks: TrackSnapshot = NO_TRACKS;
  private player: Mpegts.Player | null = null;
  private detachGate: () => void = () => undefined;
  private generation = 0;

  constructor(
    private readonly loadLib: MpegtsLoader = importMpegts,
    private readonly probe: (url: string) => Promise<UrlProbe> = probeUrl,
  ) {}

  async load(
    video: HTMLVideoElement,
    url: string,
    options: LoadOptions,
    listener: TransportListener,
  ): Promise<void> {
    const generation = ++this.generation;
    const [lib, probe] = await Promise.all([this.loadLib(), this.probe(url)]);
    if (generation !== this.generation) return;
    this.player = startPlayer(lib, video, url, isLivePipe(options, probe), options, listener);
    this.detachGate = attachBufferGate(video, options.buffer ?? thresholdsFor('Small')).detach;
    listener.onTracksChanged(NO_TRACKS);
  }

  stop(): void {
    this.generation += 1;
    this.detachGate();
    this.detachGate = () => undefined;
    const player = this.player;
    this.player = null;
    if (player === null) return;
    player.pause();
    player.unload();
    player.detachMediaElement();
    player.destroy();
  }

  /** A single-program TS has nothing to pick; the quick-bar shows the pickers empty. */
  selectVideo(): void {
    return undefined;
  }

  selectAudio(): void {
    return undefined;
  }

  selectText(): void {
    return undefined;
  }
}
