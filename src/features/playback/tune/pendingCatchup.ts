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
    const hit = this.stashed;
    this.stashed = null;
    return explicit ?? this.replayFor(hit, channelId);
  }

  private replayFor(hit: { channelId: number; url: string } | null, channelId: number): string | null {
    return hit?.channelId === channelId ? hit.url : null;
  }
}
