import type { ChannelOptionsDialog } from '@/features/channelmenu/channelOptionsController';
import type { BlockPinMode } from '@/features/channelmenu/sheetActions';
import type { CustomRecordingForm } from '@/features/recording/customRecordingForm';
import type { GroupToolSession } from '@/features/groups/groupToolSession';
import type { GuideInfoData } from './guideInfoBuilder';
import { type GuideCell, NO_INFORMATION } from './guideModel';

/**
 * Which interaction layer owns the D-pad on the guide screen (Android
 * `GuideLayer`). Pushed screens carry the layer BACK returns to; Channel
 * options REPLACES the sheet so its BACK lands on the grid.
 */
export type GuideLayer =
  | { kind: 'Grid' }
  | { kind: 'Groups' }
  | { kind: 'CellMenu'; cell: GuideCell }
  | { kind: 'RowMenu' }
  | { kind: 'ComingSoon'; feature: string; back: GuideLayer }
  | { kind: 'Description'; title: string; text: string; back: GuideLayer }
  /** The §41 pane; its rename/picker dialog is a field here, so BACK pops dialog, then pane. */
  | { kind: 'ChannelOptions'; channelId: number; dialog: ChannelOptionsDialog | null }
  | { kind: 'BlockPin'; channelId: number; mode: BlockPinMode; back: GuideLayer }
  | { kind: 'GroupPin'; group: string }
  | { kind: 'GroupTool'; session: GroupToolSession }
  /** DVR: "Stop recording?" behind a second Record on a channel already being captured. */
  | { kind: 'RecordingStop'; recordingId: number; channelName: string; back: GuideLayer }
  /** DVR: the "Custom recording" form it carries; BACK pops back to the sheet / dropdown's grid. */
  | { kind: 'CustomRecording'; form: CustomRecordingForm; back: GuideLayer };

export const GRID: GuideLayer = { kind: 'Grid' };
export const GROUPS: GuideLayer = { kind: 'Groups' };
export const ROW_MENU: GuideLayer = { kind: 'RowMenu' };

/** One BACK level per layer: pushed screens → their `back`, tools → the sheet, everything else → grid. */
export function backOf(layer: GuideLayer): GuideLayer {
  switch (layer.kind) {
    case 'ComingSoon':
    case 'Description':
    case 'BlockPin':
    case 'RecordingStop':
    case 'CustomRecording':
      return layer.back;
    case 'GroupTool':
      return ROW_MENU;
    case 'GroupPin':
      return GROUPS;
    default:
      return GRID;
  }
}

/** The sheet's Program-description layer from the focused programme. */
export function descriptionLayer(info: GuideInfoData | null): GuideLayer {
  return {
    kind: 'Description',
    title: info?.title ?? NO_INFORMATION,
    text: info?.description ?? NO_INFORMATION,
    back: ROW_MENU,
  };
}

/** Layers rendered as a pushed surface over the (dimmed) grid. */
export function isPushed(layer: GuideLayer): boolean {
  return !['Grid', 'Groups', 'CellMenu', 'RowMenu'].includes(layer.kind);
}
