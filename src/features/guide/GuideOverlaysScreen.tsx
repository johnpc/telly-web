import type { JSX } from 'react';
import { GuideCellMenuScreen } from './GuideCellMenuScreen';
import { GuideLayersScreen } from './GuideLayersScreen';
import { GuideRowMenuScreen } from './GuideRowMenuScreen';
import { GuideScrimScreen } from './GuideScrimScreen';
import { GuideToastsScreen } from './GuideToastsScreen';
import type { GuideController } from './guideController';
import type { GuideRow } from './guideModel';

interface OverlaysProps {
  controller: GuideController;
  rows: readonly GuideRow[];
  rowHeightDp: number;
}

/** Everything layered over the grid: toasts, the sheet scrim, the dropdown, the sheet and its pushed screens. */
export function GuideOverlaysScreen({ controller, rows, rowHeightDp }: OverlaysProps): JSX.Element {
  return (
    <>
      <GuideCellMenuScreen controller={controller} rows={rows} rowHeightDp={rowHeightDp} />
      <GuideToastsScreen controller={controller} />
      <GuideScrimScreen controller={controller} rows={rows} rowHeightDp={rowHeightDp} />
      <GuideRowMenuScreen controller={controller} rows={rows} info={controller.parts.info()} />
      <GuideLayersScreen controller={controller} />
    </>
  );
}
