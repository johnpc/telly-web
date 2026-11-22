import type { GuideFocusEngine } from './guideFocusEngine';
import type { GuideCommand } from './guideKeyPolicy';
import { GROUPS } from './guideLayer';
import type { GuideMenuController } from './guideMenuController';
import type { GuideRow } from './guideModel';

export interface GuideCommandDeps {
  engine: GuideFocusEngine;
  menu: GuideMenuController;
  rows: () => readonly GuideRow[];
  /** EPG -> Past days to keep EPG: clamps the day jumps. */
  pastDays: () => number;
  /** Appearance -> TV guide -> Number of visible channels (CH± page size). */
  visibleRows: () => number;
  /** OK on the focused cell: play the channel / play a catch-up archive. */
  activate: () => void;
}

type Handlers = {
  [K in GuideCommand['kind']]: (deps: GuideCommandDeps, command: Extract<GuideCommand, { kind: K }>) => void;
};

/** One transition per command (Android `GuideCommands.execute`). */
const HANDLERS: Handlers = {
  // LEFT at the live edge opens the groups column instead of panning.
  FocusLeft: (d) => {
    if (!d.engine.moveLeft(d.rows())) d.menu.show(GROUPS);
  },
  FocusRight: (d) => d.engine.moveRight(d.rows()),
  FocusUp: (d) => d.engine.moveVertical(d.rows(), -1),
  FocusDown: (d) => d.engine.moveVertical(d.rows(), 1),
  PageRows: (d, c) => d.engine.moveVertical(d.rows(), c.direction * d.visibleRows()),
  DayJump: (d, c) => d.engine.dayJump(c.days, d.pastDays()),
  // Page-left at the live edge opens the groups column like a plain LEFT.
  PageJump: (d, c) => {
    if (!d.engine.pageJump(d.rows(), c.direction) && c.direction < 0) d.menu.show(GROUPS);
  },
  Activate: (d) => d.activate(),
  OpenRowMenu: (d) => d.menu.openRowMenu(),
  OpenCellMenu: (d) => d.menu.openCellMenu(d.engine.focus?.cell ?? null),
  OpenGroups: (d) => d.menu.show(GROUPS),
  CloseLayer: (d) => d.menu.close(),
};

/**
 * Executes `GuideCommand`s against the focus engine and layer controller —
 * the transition half of the guide state machine (Android `GuideCommands`).
 */
export function executeCommand(deps: GuideCommandDeps, command: GuideCommand): void {
  const handler = HANDLERS[command.kind] as (deps: GuideCommandDeps, command: GuideCommand) => void;
  handler(deps, command);
}
