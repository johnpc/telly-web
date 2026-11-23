import { Observable } from '@/core/state/observable';

/**
 * How many device pixels the open soft remote reserves at the bottom of the
 * shell (`--soft-remote-inset` in index.css): the 3×40 px pad with its 4 px
 * gaps and 6 px bar gap + the 40 px bar inside 8 px padding (190), the 8 px
 * gap to the 40 px toggle and the 12 px screen margin.
 */
export const SOFT_REMOTE_INSET_PX = 262;

/** The inset as a store, so layout hooks (the dp canvas) re-measure when the remote opens or closes. */
export class SoftRemoteInset extends Observable {
  private px = 0;

  get value(): number {
    return this.px;
  }

  set(px: number): void {
    if (px === this.px) return;
    this.px = px;
    this.notify();
  }
}

export const softRemoteInset = new SoftRemoteInset();
