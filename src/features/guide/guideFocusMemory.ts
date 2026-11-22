import type { GuideFocusEngine, GuideFocusState } from './guideFocusEngine';
import { cellAt, rowIndexOf } from './guideFocusNav';
import type { GuideCell, GuideFocus, GuideRow } from './guideModel';
import { rowWindow } from './guideScrollPlanner';

/** Identity-keyed snapshot of the grid's focus + scroll behind a sheet. */
export interface GuideFocusSnapshot {
  channelId: number;
  state: GuideFocusState;
}

/** Empty · Saved(snapshot) · Consumed(channelId) — the last channel outlives the restore for the scrim hole. */
export type FocusMemoryState =
  | { kind: 'Empty' }
  | { kind: 'Saved'; snapshot: GuideFocusSnapshot }
  | { kind: 'Consumed'; channelId: number };

/** The saved cell if it still exists, else the cell at the anchor. */
function cellFor(cells: readonly GuideCell[], saved: GuideFocus): GuideCell | null {
  return cells.find((c) => c.startMs === saved.cell.startMs) ?? cellAt(cells, saved.anchorMs);
}

/** The saved cell on row `rowIndex` if it still exists, else the cell at the anchor; null off the list. */
function restoredCell(rows: readonly GuideRow[], rowIndex: number, saved: GuideFocus): GuideCell | null {
  const cells = rows[rowIndex]?.cells;
  return cells === undefined ? null : cellFor(cells, saved);
}

/** The saved focus moved onto the channel's CURRENT row; null when the channel vanished. */
function snapshotTarget(snapshot: GuideFocusSnapshot, rows: readonly GuideRow[]): GuideFocus | null {
  const { focus } = snapshot.state;
  const rowIndex = rowIndexOf(rows, snapshot.channelId);
  const cell = focus === null ? null : restoredCell(rows, rowIndex, focus);
  return focus === null || cell === null ? null : { ...focus, rowIndex, cell };
}

/** The snapshot re-targeted onto the channel's CURRENT row; null when it vanished. */
export function resolveSnapshot(
  snapshot: GuideFocusSnapshot,
  rows: readonly GuideRow[],
  visibleRows: number,
): GuideFocusState | null {
  const focus = snapshotTarget(snapshot, rows);
  if (focus === null) return null;
  const firstRow = rowWindow(snapshot.state.firstRow, focus.rowIndex, visibleRows, rows.length);
  return { ...snapshot.state, focus, firstRow };
}

/**
 * Saves the grid's focus when the row context sheet opens and re-asserts it
 * once when the layer chain closes back to the grid. The engine's focus is
 * positional (row INDEX), so rows re-emitting under an open sheet would
 * otherwise land it on whatever slid into that index (Android
 * `GuideFocusMemory`). Keyed by channel id; consumed on the first restore.
 */
// @stateMachine('Guide focus memory')
export class GuideFocusMemory {
  private state: FocusMemoryState = { kind: 'Empty' };

  constructor(
    private readonly engine: GuideFocusEngine,
    private readonly visibleRows: () => number,
    private readonly rows: () => readonly GuideRow[],
  ) {}

  get current(): FocusMemoryState['kind'] {
    return this.state.kind;
  }

  /** The channel the sheet was last opened on (survives the restore). */
  get savedChannelId(): number | null {
    if (this.state.kind === 'Saved') return this.state.snapshot.channelId;
    return this.state.kind === 'Consumed' ? this.state.channelId : null;
  }

  /** Snapshots the focused channel, cell and scroll as the sheet opens. */
  save(): void {
    const focus = this.engine.focus;
    const channel = focus === null ? undefined : this.rows()[focus.rowIndex]?.channel;
    if (channel === undefined) {
      this.state = { kind: 'Empty' };
      return;
    }
    const state: GuideFocusState = { focus, scrollX: this.engine.scrollX, firstRow: this.engine.firstRow };
    this.state = { kind: 'Saved', snapshot: { channelId: channel.id, state } };
  }

  /** Re-asserts the snapshot once, on the first return to the grid. */
  restore(): void {
    if (this.state.kind !== 'Saved') return;
    const { snapshot } = this.state;
    this.state = { kind: 'Consumed', channelId: snapshot.channelId };
    const restored = resolveSnapshot(snapshot, this.rows(), this.visibleRows());
    if (restored !== null) this.engine.apply(restored);
  }
}
