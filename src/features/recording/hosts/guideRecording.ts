import type { ChannelRow } from '@/core/db/types';
import { programTitle } from '@/features/epg/nowNext';
import type { GuideLayer } from '@/features/guide/guideLayer';
import type { GuideCell } from '@/features/guide/guideModel';
import type { RecordingCenter } from '../recordingCenter';
import { RecordingMenu } from '../recordingMenu';
import type { RecordingPrompt } from '../recordingPrompt';
import { recordingCenter } from '../recordingRuntime';

export interface GuideRecordingDeps {
  show: (layer: GuideLayer) => void;
  layer: () => GuideLayer;
  center?: RecordingCenter;
  clock?: () => number;
}

/**
 * The guide's Record / Custom recording actions (Android `GuideRecordingActions`
 * + `GuideRecordingPrompts`): the sheet row instant-records the focused
 * channel, the cell dropdown schedules the focused programme's slot (or
 * instant-records an airing one), and prompts map onto guide layers —
 * completed actions land back on the grid, the Stop confirm and the custom
 * form get their own layers.
 */
export interface GuideRecording {
  menu: RecordingMenu;
  /** The sheet's Record row: instant record of the row's channel. */
  record(channel: ChannelRow): void;
  /** Cell-dropdown Record: the focused programme's slot (instant when it is airing now). */
  recordCell(channel: ChannelRow, cell: GuideCell, nowMs: number): void;
  /** Both the sheet row and the cell dropdown open the same form. */
  customRecording(channel: ChannelRow): void;
  confirmStop(recordingId: number): void;
}

export function layerFor(prompt: RecordingPrompt, current: GuideLayer): GuideLayer {
  switch (prompt.kind) {
    case 'Done':
      return { kind: 'Grid' };
    case 'StopConfirm':
      return {
        kind: 'RecordingStop',
        recordingId: prompt.recordingId,
        channelName: prompt.channelName,
        back: { kind: 'Grid' },
      };
    case 'CustomForm':
      return { kind: 'CustomRecording', back: current };
  }
}

/** An airing cell instant-records; a future one schedules its slot under the programme's title. */
export function recordCell(menu: RecordingMenu, channel: ChannelRow, cell: GuideCell, nowMs: number): void {
  if (cell.startMs <= nowMs && nowMs < cell.endMs) return menu.onRecord(channel);
  const title = cell.program === null ? null : programTitle(cell.program);
  menu.onRecordProgramme(channel, title, cell.startMs, cell.endMs);
}

export function createGuideRecording(deps: GuideRecordingDeps): GuideRecording {
  const menu = new RecordingMenu({
    center: deps.center ?? recordingCenter,
    clock: deps.clock ?? ((): number => Date.now()),
    show: (prompt) => deps.show(layerFor(prompt, deps.layer())),
  });
  return {
    menu,
    record: (channel) => menu.onRecord(channel),
    recordCell: (channel, cell, nowMs) => recordCell(menu, channel, cell, nowMs),
    customRecording: (channel) => menu.onCustomRecording(channel),
    confirmStop: (recordingId) => menu.confirmStop(recordingId),
  };
}
