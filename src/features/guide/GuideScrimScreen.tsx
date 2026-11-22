import type { JSX } from 'react';
import type { GuideController } from './guideController';
import { SCRIM_COLOR } from './guideCss';
import { bandTopDp } from './guideDimExemption';
import { dp } from './guideGeometry';
import { isPushed } from './guideLayer';
import type { GuideRow } from './guideModel';

interface ScrimProps {
  controller: GuideController;
  rows: readonly GuideRow[];
  rowHeightDp: number;
}

/** The scrim split into the band above and the band below the undimmed row. */
function ScrimBands({ top, rowHeightDp }: { top: number; rowHeightDp: number }): JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-0 z-20" data-testid="guide-scrim">
      <div className="absolute inset-x-0 top-0" style={{ height: dp(top), background: SCRIM_COLOR }} />
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ top: dp(top + rowHeightDp), background: SCRIM_COLOR }}
      />
    </div>
  );
}

/**
 * The 60 % black backdrop behind the sheet and its pushed layers, with the
 * originating row punched out at full brightness (round-7 P2: TiviMate dims
 * every grid row EXCEPT the long-OK row).
 */
export function GuideScrimScreen({ controller, rows, rowHeightDp }: ScrimProps): JSX.Element | null {
  const layer = controller.layer;
  if (layer.kind !== 'RowMenu' && !isPushed(layer)) return null;
  const top = bandTopDp(controller.menu.sheetChannelId, rows, controller.engine.firstRow, rowHeightDp);
  if (top !== null) return <ScrimBands top={top} rowHeightDp={rowHeightDp} />;
  return (
    <div className="absolute inset-0 z-20" style={{ background: SCRIM_COLOR }} data-testid="guide-scrim" />
  );
}
