import { parseM3u } from '@/features/playlist/m3uParser';
import type { M3uPlaylist } from '@/features/playlist/m3uTypes';
import { groupCount, isHttpUrl, liveCount, movieCount, suggestName } from './playlistSummary';
import { type PlaylistKind, type PlaylistType, type WizardStep } from './wizardState';
import { WizardStore } from './wizardStore';

/** What the wizard needs from the outside world (Android's constructor lambdas). */
export interface WizardDeps {
  fetchPlaylist: (url: string) => Promise<string>;
  /** Persists the processed playlist under `name` (null = derive from the URL). */
  persist: (sourceUrl: string, playlist: M3uPlaylist, name: string | null) => Promise<void>;
}

/** BACK: one step backwards (SAVING swallows it; TYPE_CHOOSER/DONE leave the wizard). */
const BACK_TARGET: Readonly<Partial<Record<WizardStep, WizardStep>>> = {
  URL_ENTRY: 'TYPE_CHOOSER',
  PROCESSING: 'URL_ENTRY',
  PROCESSED: 'URL_ENTRY',
  EPG_URL: 'PROCESSED',
};

/**
 * State holder for the add-playlist wizard (port of Android
 * `AddPlaylistViewModel.kt`): the UI feeds intents in, `state` carries the
 * step, drafts and errors out. The playlist is persisted only when the EPG
 * step's Done confirms it (`addPlaylistEpg.ts`).
 */
export class AddPlaylistViewModel extends WizardStore {
  parsed: M3uPlaylist | null = null;
  private loadToken = 0;

  constructor(readonly deps: WizardDeps) {
    super();
  }

  /** Only the M3U path exists in this slice; other types are inert. */
  chooseType(type: PlaylistType): void {
    if (type === 'M3U') this.patch({ step: 'URL_ENTRY' });
  }

  setUrl(url: string): void {
    this.patch({ url, error: null });
  }

  setName(name: string): void {
    this.patch({ name });
  }

  chooseKind(kind: PlaylistKind): void {
    this.patch({ kind });
  }

  /** Validates the URL (http/https only) and kicks off fetch + parse. */
  submitUrl(): void {
    if (this.state.step !== 'URL_ENTRY') return;
    const url = this.state.url.trim();
    if (!isHttpUrl(url)) {
      this.patch({ error: 'INVALID_URL' });
      return;
    }
    this.patch({ step: 'PROCESSING', error: null });
    this.loadToken += 1;
    void this.load(url, this.loadToken);
  }

  /** A cancelled load (BACK during PROCESSING) is ignored when it lands. */
  private async load(url: string, token: number): Promise<void> {
    try {
      const playlist = parseM3u(await this.deps.fetchPlaylist(url));
      if (playlist.channels.length === 0) throw new Error(`No channels in ${url}`);
      if (token === this.loadToken) this.showProcessed(url, playlist);
    } catch {
      if (token === this.loadToken) this.patch({ step: 'URL_ENTRY', error: 'LOAD_FAILED' });
    }
  }

  private showProcessed(url: string, playlist: M3uPlaylist): void {
    if (this.state.step !== 'PROCESSING') return;
    this.parsed = playlist;
    this.patch({
      step: 'PROCESSED',
      name: suggestName(url),
      liveCount: liveCount(playlist.channels),
      movieCount: movieCount(playlist.channels),
      groupCount: groupCount(playlist.channels),
    });
  }

  /** Next on the processed step: the EPG step with the M3U's url-tvg pre-filled. */
  confirm(): void {
    if (this.state.step !== 'PROCESSED' || this.parsed === null) return;
    this.patch({ step: 'EPG_URL', epgUrl: this.parsed.epgUrl ?? '', error: null });
  }

  /** BACK semantics: one step backwards; false means "leave the wizard". */
  back(): boolean {
    const { step } = this.state;
    if (step === 'SAVING') return true;
    const target = BACK_TARGET[step];
    if (target === undefined) return false;
    if (step === 'PROCESSING') this.loadToken += 1;
    if (step === 'PROCESSED') this.parsed = null;
    this.patch({ step: target, error: null });
    return true;
  }
}
