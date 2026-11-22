import type { RestoreOffer } from './welcomeRestore';

/**
 * Applies a backup from the welcome screen (port of Android
 * `RestoreRunner.kt`): the import machinery restores settings + playlist
 * identities (with zero channels), then every restored playlist is
 * re-fetched so the normal cold-start policy has real channels to land on.
 * Success = at least one channel exists afterwards.
 */
export interface RestoreRunnerDeps {
  importJson: (json: string) => Promise<boolean>;
  playlistUrls: () => Promise<string[]>;
  updatePlaylists: (urls: string[]) => Promise<void>;
  channelCount: () => Promise<number>;
}

export class RestoreRunner {
  constructor(private readonly deps: RestoreRunnerDeps) {}

  async restore(json: string): Promise<boolean> {
    if (!(await swallow(() => this.deps.importJson(json), false))) return false;
    await swallow(() => this.refetchAll(), undefined);
    return (await swallow(() => this.deps.channelCount(), 0)) > 0;
  }

  private async refetchAll(): Promise<void> {
    await this.deps.updatePlaylists(await this.deps.playlistUrls());
  }
}

/** Kotlin `runCatching { … }.getOrDefault(fallback)`. */
async function swallow<T>(work: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await work();
  } catch {
    return fallback;
  }
}

/** Platform hooks the welcome screen's restore affordance runs on (Android `OnboardingRestore`). */
export interface RestoreHooks {
  /** Probes storage for a previous install's backup. */
  probe: () => Promise<RestoreOffer>;
  /** Applies a `Ready` backup; true when channels landed. */
  restore: (json: string) => Promise<boolean>;
  /** Opens the access grant (`NeedsAccess`); nothing to grant on the web. */
  requestAccess: () => void;
  /** Leaves the welcome screen per the normal cold-start policy. */
  land: () => void;
}
