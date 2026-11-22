// Automatic uninstall-proof export (port of Android `ConfigAutoBackup`):
// re-writes the backup JSON whenever backed-up state changes. Triggers are
// debounced, identical payloads are skipped by hash, and every failure is
// logged and swallowed — a broken export must never take the app down.
// @stateMachine('Auto backup')
import type { AutoBackupState } from './autoBackupState';

export type AutoBackupPhase =
  | { kind: 'Disabled' }
  | { kind: 'Idle'; hash: string | null }
  | { kind: 'Debouncing'; timer: ReturnType<typeof setTimeout> }
  /** An export underway runs to completion; a trigger meanwhile re-arms the debounce after it. */
  | { kind: 'Exporting'; retrigger: boolean };

export const DEBOUNCE_MS = 5_000;

export interface ConfigAutoBackupDeps {
  enabled: () => boolean;
  /** The backup JSON, or null when there is nothing worth backing up. */
  buildJson: () => Promise<string | null>;
  write: (json: string) => Promise<unknown>;
  state: AutoBackupState;
  clock: () => number;
  debounceMs?: number;
  warn?: (message: string, cause: unknown) => void;
}

/** djb2 over the payload text, hex — enough to skip rewriting an unchanged file. */
export function hashOf(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  return hash.toString(16);
}

export class ConfigAutoBackup {
  private phase: AutoBackupPhase;

  constructor(private readonly deps: ConfigAutoBackupDeps) {
    this.phase = deps.enabled() ? { kind: 'Idle', hash: deps.state.lastHash } : { kind: 'Disabled' };
  }

  get state(): AutoBackupPhase {
    return this.phase;
  }

  /** A settings/playlists change: (re)start the debounce; a disabled toggle re-checks on every trigger. */
  trigger(): void {
    if (!this.deps.enabled()) return this.disable();
    if (this.phase.kind === 'Exporting') {
      this.phase = { kind: 'Exporting', retrigger: true };
      return;
    }
    this.clearDebounce();
    const timer = setTimeout(() => void this.exportNow(), this.deps.debounceMs ?? DEBOUNCE_MS);
    this.phase = { kind: 'Debouncing', timer };
  }

  /** One export attempt: build, dedupe by hash, write, record. */
  async exportNow(): Promise<void> {
    if (!this.deps.enabled()) return this.disable();
    this.clearDebounce();
    this.phase = { kind: 'Exporting', retrigger: false };
    const retrigger = await this.attemptSafely();
    this.settle(retrigger);
  }

  /** Runs one attempt, swallowing failures; returns whether a trigger landed meanwhile. */
  private async attemptSafely(): Promise<boolean> {
    try {
      await this.attempt();
    } catch (error) {
      this.deps.warn?.('config auto-backup export failed', error);
    }
    return this.phase.kind === 'Exporting' && this.phase.retrigger;
  }

  private settle(retrigger: boolean): void {
    this.phase = { kind: 'Idle', hash: this.deps.state.lastHash };
    if (retrigger) this.trigger();
  }

  private clearDebounce(): void {
    if (this.phase.kind === 'Debouncing') clearTimeout(this.phase.timer);
  }

  /** Stops a pending debounce (unmount). */
  cancel(): void {
    this.clearDebounce();
    if (this.phase.kind !== 'Exporting') this.phase = { kind: 'Idle', hash: this.deps.state.lastHash };
  }

  private disable(): void {
    this.clearDebounce();
    this.phase = { kind: 'Disabled' };
  }

  private async attempt(): Promise<void> {
    const json = await this.deps.buildJson();
    if (json === null) return;
    const hash = hashOf(json);
    if (hash === this.deps.state.lastHash) return;
    await this.deps.write(json);
    this.deps.state.recordExport(this.deps.clock(), hash);
  }
}
