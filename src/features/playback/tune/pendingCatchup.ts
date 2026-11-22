/**
 * The gate-intercepted archive tune the PIN unlock should replay: Empty ·
 * Stashed(channelId, url). `consume` returns the url only for the SAME
 * channel's next tune (Android `PendingCatchup.kt`).
 */
export class PendingCatchup {
  private stashed: { channelId: number; url: string } | null = null;

  stash(channelId: number, url: string | null): void {
    this.stashed = url === null ? null : { channelId, url };
  }

  consume(channelId: number, explicit: string | null): string | null {
    if (explicit !== null) {
      this.stashed = null;
      return explicit;
    }
    const hit = this.stashed;
    this.stashed = null;
    return hit !== null && hit.channelId === channelId ? hit.url : null;
  }
}
