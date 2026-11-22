import { dayJumpState, pageJumpState, verticalState } from './guideFocusJumps';
import { leftOf, resolveFocus, rightOf } from './guideFocusNav';
import { DP_PER_30_MIN, TIME_VIEWPORT_DP, timeAt } from './guideGeometry';
import type { GuideCell, GuideFocus, GuideRow } from './guideModel';
import { horizontalTarget } from './guideScrollPlanner';
import { clamp, scrollCeilDp } from './guideWindowMath';
import { Observable } from './observable';

/** One settable unit of engine state: focus (null = none) + scroll. */
export interface GuideFocusState {
  focus: GuideFocus | null;
  scrollX: number;
  firstRow: number;
}

const EMPTY: GuideFocusState = { focus: null, scrollX: 0, firstRow: 0 };

/**
 * The grid's focus + scroll state machine (Android `GuideFocusEngine`):
 * horizontal moves update the time anchor and pan the window; vertical
 * moves keep the anchor and scroll by rows. Plain navigation never pans
 * left of "now"; only a day jump does, bounded by "Past days to keep EPG".
 */
export class GuideFocusEngine extends Observable {
  private state: GuideFocusState = EMPTY;

  constructor(
    readonly originMs: number,
    private readonly pastFloorDp: () => number,
    private readonly visibleRows: () => number,
    private readonly viewportDp: number = TIME_VIEWPORT_DP,
  ) {
    super();
  }

  get focus(): GuideFocus | null {
    return this.state.focus;
  }

  get scrollX(): number {
    return this.state.scrollX;
  }

  get firstRow(): number {
    return this.state.firstRow;
  }

  /** Re-asserts a remembered focus + scroll (`GuideFocusMemory.restore`). */
  apply(state: GuideFocusState): void {
    this.state = state;
    this.notify();
  }

  reset(): void {
    this.apply(EMPTY);
  }

  /** Re-resolves focus after every rows emission (loads, group switches). */
  ensureFocus(rows: readonly GuideRow[], nowMs: number): void {
    const focus = rows.length === 0 ? null : resolveFocus(rows, nowMs, this.state.focus);
    if (focus !== this.state.focus) this.apply({ ...this.state, focus });
  }

  /** False = focus already touches the left edge (the caller opens the groups column). */
  moveLeft(rows: readonly GuideRow[]): boolean {
    const current = this.state.focus;
    if (current === null) return false;
    const cells = rows[current.rowIndex]?.cells ?? [];
    const target = leftOf(cells, current.cell, timeAt(this.state.scrollX, this.originMs));
    if (target === null) return false;
    this.moveHorizontal(current, target);
    return true;
  }

  /** At the materialized edge the window pans on so more cells load. */
  moveRight(rows: readonly GuideRow[]): void {
    const current = this.state.focus;
    if (current === null) return;
    const target = rightOf(rows[current.rowIndex]?.cells ?? [], current.cell);
    if (target === null)
      this.apply({ ...this.state, scrollX: this.clampScroll(this.state.scrollX + DP_PER_30_MIN) });
    else this.moveHorizontal(current, target);
  }

  moveVertical(rows: readonly GuideRow[], delta: number): void {
    const next = verticalState(this.state, rows, delta, this.visibleRows());
    if (next !== null) this.apply(next);
  }

  dayJump(days: number, maxPastDays: number): void {
    const next = dayJumpState(this.state, this.originMs, days, maxPastDays);
    if (next !== null) this.apply(next);
  }

  /** False = already at the edge. */
  pageJump(rows: readonly GuideRow[], direction: number): boolean {
    const next = pageJumpState(this.state, rows, direction, this.viewportDp, (t) => this.clampScroll(t));
    if (next !== null) this.apply(next);
    return next !== null;
  }

  private moveHorizontal(current: GuideFocus, target: GuideCell): void {
    const scrollX = this.clampScroll(
      horizontalTarget(target, this.originMs, this.state.scrollX, this.viewportDp),
    );
    const anchorMs = Math.max(target.startMs, timeAt(scrollX, this.originMs));
    this.apply({ ...this.state, scrollX, focus: { ...current, cell: target, anchorMs } });
  }

  /** Plain moves stop at "now" unless a day jump already went past it. */
  private clampScroll(target: number): number {
    const floor = this.state.scrollX < 0 ? this.pastFloorDp() : 0;
    return clamp(target, floor, scrollCeilDp());
  }
}
