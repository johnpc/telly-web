import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { MenuRow } from '@/features/playback/ui/MenuRowScreen';
import { MENU_WIDTH_REM, type PaneCell, menuPlacement } from './multiviewGrid';
import { MENU_LABELS, type MultiviewMenuAction } from './multiviewLayer';

interface MenuProps {
  rows: readonly MultiviewMenuAction[];
  /** The focused pane's cell: the menu sits right of it, vertically centred. */
  cell: PaneCell;
  onAction: (action: MultiviewMenuAction) => void;
  onBack: () => void;
}

/**
 * The pane menu: a dark popup right of the focused pane, rows in captured
 * order — Add screen / Search and add / Change channel (+ Remove screen while
 * the grid has more than one pane). Focus starts on the first row.
 */
export function MultiviewScreenMenu({ rows, cell, onAction, onBack }: MenuProps): JSX.Element {
  const placement = menuPlacement(cell, rows.length);
  return (
    <FocusScope id="multiview-menu" trap autoFocus="first" onBack={onBack}>
      <div
        data-testid="multiview-menu"
        className="absolute rounded bg-telly-menu-sheet"
        style={{ ...placement, width: `${MENU_WIDTH_REM}rem` }}
      >
        {rows.map((action) => (
          <MenuRow
            key={action}
            focusId={`multiview-menu-${action}`}
            label={MENU_LABELS[action]}
            onClick={() => onAction(action)}
            testId="multiview-menu-row"
          />
        ))}
      </div>
    </FocusScope>
  );
}
