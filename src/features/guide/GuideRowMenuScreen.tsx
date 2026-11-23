import type { JSX } from 'react';
import { displayName } from '@/core/db/types';
import { SheetScreen } from '@/features/channelmenu/SheetScreen';
import { sheetSections } from '@/features/channelmenu/sheetMenu';
import { useMyListKeys } from '@/features/mylist/myListToggle';
import type { GuideController } from './guideController';
import { sheetFlagsFor, sheetTarget } from './guideCellLabels';
import type { GuideInfoData } from './guideInfoBuilder';
import type { GuideRow } from './guideModel';

interface RowMenuProps {
  controller: GuideController;
  rows: readonly GuideRow[];
  info: GuideInfoData | null;
}

/**
 * MENU on a guide row: the shared context sheet with the grid still visible
 * behind it (round3-ref 05, captures 38-40); the scrim around the
 * originating row is the guide's own (`GuideScrimScreen`).
 */
export function GuideRowMenuScreen({ controller, rows, info }: RowMenuProps): JSX.Element | null {
  const myList = useMyListKeys();
  const target = controller.layer.kind === 'RowMenu' ? sheetTarget(controller.engine.focus, rows) : null;
  if (target === null) return null;
  return (
    <SheetScreen
      scopeId="guide-sheet"
      focusPrefix="guide-sheet-"
      sections={sheetSections(info?.title ?? null, displayName(target.row.channel))}
      flags={sheetFlagsFor(target.row.channel, target.cell.program, myList)}
      autoFocus="remembered"
      restore={null}
      scrim={false}
      onItem={controller.parts.onSheetItem}
    />
  );
}
