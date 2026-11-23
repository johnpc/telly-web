import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { FocusScope } from '@/core/focus/FocusScope';
import type { GuideController } from './guideController';
import { cellActionLabel } from './guideCellLabels';
import { sp } from './guideCss';
import { MENU_ROW_DP, MENU_WIDTH_DP, dropdownAnchor } from './guideDropdownAnchor';
import { dp } from './guideGeometry';
import { GUIDE_CELL_ACTIONS, type GuideRow } from './guideModel';
import { useMyListKeys } from '@/features/mylist/myListToggle';
import { useReminderKeys } from './useSheetKeys';

interface CellMenuProps {
  controller: GuideController;
  rows: readonly GuideRow[];
  rowHeightDp: number;
}

/**
 * The long-OK cell dropdown anchored under the focused cell (capture 27):
 * Play channel / Remind / Record / Custom recording / Add to My list /
 * Program description, with the Remind and My-list labels live.
 */
export function GuideCellMenuScreen({ controller, rows, rowHeightDp }: CellMenuProps): JSX.Element | null {
  const myList = useMyListKeys();
  const reminders = useReminderKeys();
  const layer = controller.layer;
  const focus = controller.engine.focus;
  if (layer.kind !== 'CellMenu' || focus === null) return null;
  const { engine, originMs } = controller;
  const anchor = dropdownAnchor(
    focus,
    engine.firstRow,
    originMs,
    engine.scrollX,
    rowHeightDp,
    controller.dims,
  );
  const state = { channel: rows[focus.rowIndex]?.channel, program: layer.cell.program, myList, reminders };
  return (
    <FocusScope id="guide-cell-menu" trap autoFocus="first">
      <ul
        className="absolute z-20 flex flex-col overflow-hidden rounded-[4px] bg-telly-menu-sheet shadow-xl"
        style={{
          left: dp(anchor.xDp),
          top: dp(controller.dims.gridTopDp + anchor.yDp),
          width: dp(MENU_WIDTH_DP),
        }}
        data-testid="guide-cell-menu"
      >
        {GUIDE_CELL_ACTIONS.map((action) => (
          <Focusable
            key={action}
            as="li"
            focusId={`guide-cell-action-${action.replaceAll(' ', '-')}`}
            className="flex items-center text-telly-text"
            style={{ height: dp(MENU_ROW_DP), paddingLeft: dp(16), paddingRight: dp(16), fontSize: sp(15) }}
            focusedClassName="bg-telly-focus-fill focused:text-telly-focus-text"
            onClick={() => controller.parts.onCellAction(action)}
          >
            {cellActionLabel(action, state)}
          </Focusable>
        ))}
      </ul>
    </FocusScope>
  );
}
