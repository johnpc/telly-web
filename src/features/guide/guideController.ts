import type { CustomGroup } from '@/features/groups/customGroups';
import { ExitConfirm } from './exitConfirm';
import { executeCommand } from './guideCommands';
import { pastDaysOf, resumeFocus, visibleRowsOf } from './guideControllerFlows';
import { type GuideParts, buildParts } from './guideControllerParts';
import { GuideFocusEngine } from './guideFocusEngine';
import { GuideFocusMemory } from './guideFocusMemory';
import { halfHourFloor } from './guideGeometry';
import { GuideGroupMemory } from './guideGroupMemory';
import { type GuideKey, commandFor } from './guideKeyPolicy';
import { keymapFrom } from './guideKeymap';
import type { GuideLayer } from './guideLayer';
import { GuideMenuController } from './guideMenuController';
import type { GuideRow } from './guideModel';
import { scrollFloorDp } from './guideWindowMath';
import type { GuideControllerDeps } from './guideWiring';
import { Observable } from './observable';

export type { GuideControllerDeps } from './guideWiring';

/**
 * The TV-guide screen's state machine (Android `GuideController`): grid rows
 * over the visible window, focus/scroll, the active layer, and the preview
 * tuner. Rows and "now" are fed by the host's hooks; keys arrive as
 * `GuideKey`s and go through the layer policy.
 */
export class GuideController extends Observable {
  readonly originMs: number;
  readonly engine: GuideFocusEngine;
  readonly menu: GuideMenuController;
  readonly exit = new ExitConfirm();
  readonly groupMemory: GuideGroupMemory;
  readonly parts: GuideParts;
  private list: readonly GuideRow[] = [];
  private custom: readonly CustomGroup[] = [];
  private nowMs: number;
  private resumePending: boolean;
  private rowsLoaded = false;

  constructor(readonly deps: GuideControllerDeps) {
    super();
    this.nowMs = deps.now();
    this.originMs = halfHourFloor(this.nowMs);
    this.resumePending = deps.tunesPreview;
    const visibleRows = (): number => visibleRowsOf(deps);
    this.engine = new GuideFocusEngine(this.originMs, () => scrollFloorDp(pastDaysOf(deps)), visibleRows);
    this.groupMemory = new GuideGroupMemory(deps.store);
    const focusMemory = new GuideFocusMemory(this.engine, visibleRows, () => this.list);
    this.menu = new GuideMenuController({
      focusedRow: () => this.focusedRow(),
      focusMemory,
      closeOptionsDialog: () => this.parts.options.closeDialog(),
    });
    this.parts = buildParts(this, deps);
    const forward = (): void => this.notify();
    [this.engine, this.menu, this.exit, this.parts.options].forEach((source) => source.subscribe(forward));
  }

  get rows(): readonly GuideRow[] {
    return this.list;
  }

  get customGroups(): readonly CustomGroup[] {
    return this.custom;
  }

  get now(): number {
    return this.nowMs;
  }

  get layer(): GuideLayer {
    return this.menu.layer;
  }

  get selectedGroup(): string {
    return this.groupMemory.value;
  }

  /** True once the first rows emission landed (keys before that are parked and replayed). */
  get loaded(): boolean {
    return this.rowsLoaded;
  }

  setNow(nowMs: number): void {
    this.nowMs = nowMs;
    this.notify();
  }

  setCustomGroups(groups: readonly CustomGroup[]): void {
    this.custom = groups;
  }

  /** Every rows emission re-resolves focus; the first non-empty one may seed the last-tuned row (BACK from fullscreen). */
  setRows(rows: readonly GuideRow[]): void {
    this.list = rows;
    this.rowsLoaded = true;
    if (this.resumePending && rows.length > 0) resumeFocus(this, this.deps, rows);
    this.resumePending = this.resumePending && rows.length === 0;
    this.engine.ensureFocus(rows, this.nowMs);
    this.notify();
  }

  /** Routes a key through the layer map; true = consumed. */
  onKey(key: GuideKey): boolean {
    const command = commandFor(this.layer, key, keymapFrom(this.deps.settings));
    if (command === null) return false;
    executeCommand(this.parts.commands, command);
    return true;
  }

  /** OK on a group filters the grid and renumbers from 1; a parental-locked group prompts for the PIN first. */
  selectGroup(group: string): void {
    if (this.deps.parental.isGroupLocked(group)) return this.menu.show({ kind: 'GroupPin', group });
    if (this.groupMemory.select(group)) this.engine.reset();
    this.menu.reset();
  }

  focusedRow(): GuideRow | undefined {
    const focus = this.engine.focus;
    return focus === null ? undefined : this.list[focus.rowIndex];
  }

  dispose(): void {
    this.exit.dispose();
  }
}
