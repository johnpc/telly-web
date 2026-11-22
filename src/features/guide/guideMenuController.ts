import type { GuideFocusMemory } from './guideFocusMemory';
import { GRID, type GuideLayer, ROW_MENU, backOf } from './guideLayer';
import type { GuideCell, GuideRow } from './guideModel';
import { Observable } from './observable';

/** What the layer machine needs from its host to close dialogs and know the focused row. */
export interface GuideMenuDeps {
  focusedRow: () => GuideRow | undefined;
  focusMemory: GuideFocusMemory;
  /** The Channel-options pane's in-pane dialog close; true when one was open. */
  closeOptionsDialog: () => boolean;
}

/**
 * The guide's overlay-layer state machine (Android `GuideMenuController`):
 * the ONE writer of `GuideLayer`. Closing back to the grid re-asserts the
 * saved grid focus first; BACK pops one level at a time.
 */
// @stateMachine('Guide layer')
export class GuideMenuController extends Observable {
  private current: GuideLayer = GRID;

  constructor(private readonly deps: GuideMenuDeps) {
    super();
  }

  get layer(): GuideLayer {
    return this.current;
  }

  /** The channel the sheet scrim dims AROUND (the originating row stays bright). */
  get sheetChannelId(): number | null {
    return this.deps.focusMemory.savedChannelId;
  }

  show(next: GuideLayer): void {
    if (next.kind === 'Grid') this.deps.focusMemory.restore();
    this.current = next;
    this.notify();
  }

  reset(): void {
    this.show(GRID);
  }

  /** BACK pops one level; an open Channel-options dialog closes first, keeping the pane up. */
  close(): void {
    if (this.current.kind === 'ChannelOptions' && this.deps.closeOptionsDialog()) return;
    this.show(backOf(this.current));
  }

  /** Long-OK on a focused cell opens the anchored dropdown (capture 27). */
  openCellMenu(cell: GuideCell | null): void {
    if (cell !== null) this.show({ kind: 'CellMenu', cell });
  }

  /** MENU with a focused row opens the sheet (round3-ref 05), remembering the grid focus. */
  openRowMenu(): void {
    if (this.deps.focusedRow() === undefined) return;
    this.deps.focusMemory.save();
    this.show(ROW_MENU);
  }

  /** A sheet row that acts and lands back on the grid. */
  actThenReset(action: () => void): void {
    action();
    this.reset();
  }

  comingSoon(feature: string, back: GuideLayer = GRID): void {
    this.show({ kind: 'ComingSoon', feature, back });
  }
}
