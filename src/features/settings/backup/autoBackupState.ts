/** What the General pane's "Automatic backup" row shows. */
export interface AutoBackupStatus {
  lastExportMs: number | null;
}

/** Where the automatic backup lands: the Origin Private File System (browser storage). */
export const AUTO_BACKUP_LOCATION = 'browser storage';

const FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function autoBackupSummary(status: AutoBackupStatus): string {
  if (status.lastExportMs === null) return `Backs up to ${AUTO_BACKUP_LOCATION} on every change`;
  return `Last backup ${FORMAT.format(new Date(status.lastExportMs))} · ${AUTO_BACKUP_LOCATION}`;
}

/** The slice of `Storage` the bookkeeping uses; tests pass a Map-backed fake. */
export type ScalarStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const KEY_LAST_MS = 'telly-kv:autoBackupLastMs';
export const KEY_LAST_HASH = 'telly-kv:autoBackupLastHash';

/**
 * Auto-backup bookkeeping (last export time + payload hash; port of Android
 * `AutoBackupState`). Lives under its own keys, NOT the `telly:` settings
 * prefix: recording an export there would itself change the settings
 * snapshot and re-trigger the export loop.
 */
export class AutoBackupState {
  private readonly listeners = new Set<() => void>();
  private current: AutoBackupStatus;

  constructor(private readonly storage: ScalarStorage) {
    const raw = storage.getItem(KEY_LAST_MS);
    this.current = { lastExportMs: raw === null ? null : Number(raw) };
  }

  get status(): AutoBackupStatus {
    return this.current;
  }

  /** The hash of the last exported payload; unchanged payloads skip IO. */
  get lastHash(): string | null {
    return this.storage.getItem(KEY_LAST_HASH);
  }

  recordExport(atMs: number, hash: string): void {
    this.storage.setItem(KEY_LAST_MS, String(atMs));
    this.storage.setItem(KEY_LAST_HASH, hash);
    this.current = { lastExportMs: atMs };
    this.listeners.forEach((listener) => listener());
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}
