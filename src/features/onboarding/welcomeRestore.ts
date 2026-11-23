import { decodeBackup } from '@/core/settings/backupCodec';

/**
 * The welcome screen's "Restore previous setup" affordance state (port of
 * Android `WelcomeRestore.kt`). On the web the automatic backup lives in
 * the Origin Private File System, so `NeedsAccess` (Android's scoped-storage
 * grant) is never produced — kept for parity of the catalog row.
 */
// @stateMachine('Welcome restore offer')
export type RestoreOffer =
  /** No backup anywhere we can see: the plain two-button welcome. */
  | { kind: 'None' }
  /** A readable telly backup: restoring applies `json` directly. */
  | { kind: 'Ready'; json: string }
  /** A previous install's file exists but is hidden until an access grant. */
  | { kind: 'NeedsAccess' }
  /** OK on a Ready pill: the backup is being applied ("Restoring…"); a second OK is ignored. */
  | { kind: 'Restoring'; json: string };

export const NO_RESTORE: RestoreOffer = { kind: 'None' };

/** Pure policy: what the welcome screen offers, from the probe's findings. */
export function offerOf(json: string | null, sighted: boolean, canRequestAccess: boolean): RestoreOffer {
  if (json !== null && decodeBackup(json) !== null) return { kind: 'Ready', json };
  if (sighted && canRequestAccess) return { kind: 'NeedsAccess' };
  return NO_RESTORE;
}
