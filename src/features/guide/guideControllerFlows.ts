import type { ChannelRow } from '@/core/db/types';
import { TellySettings } from '@/core/settings/tellySettings';
import { LAST_CHANNEL_KEY } from '@/features/playback/tune';
import { activate } from './guideActivation';
import type { GuideController } from './guideController';
import { cellOnRow } from './guideFocusJumps';
import { rowIndexOf } from './guideFocusNav';
import type { GuideRow } from './guideModel';
import { rowWindow } from './guideScrollPlanner';
import type { GuideSheetActions } from './guideSheetActions';
import type { GuideCommandDeps } from './guideCommands';
import { CLOCK_12H, CLOCK_24H, type ClockStyle, is24Raw } from './guideTimes';
import type { GuideControllerDeps } from './guideWiring';

export function visibleRowsOf(deps: GuideControllerDeps): number {
  return Math.max(1, deps.settings.get(TellySettings.GUIDE_VISIBLE_CHANNELS));
}

export function pastDaysOf(deps: GuideControllerDeps): number {
  return deps.settings.get(TellySettings.EPG_PAST_DAYS_TO_KEEP);
}

/**
 * Seeds the fresh grid's focus onto the last-tuned channel's row, so BACK
 * from fullscreen lands on the row OK left from (Android `GuideFocusResume`).
 * A channel missing from the rows (or already at row 0) keeps the default.
 */
export function resumeFocus(
  controller: GuideController,
  deps: GuideControllerDeps,
  rows: readonly GuideRow[],
): void {
  const raw = deps.store.get(LAST_CHANNEL_KEY);
  const rowIndex = raw === null ? -1 : rowIndexOf(rows, Number(raw));
  const cell = rowIndex <= 0 ? null : cellOnRow(rows, rowIndex, controller.now);
  if (cell === null) return;
  controller.engine.apply({
    focus: { rowIndex, cell, anchorMs: controller.now },
    scrollX: controller.engine.scrollX,
    firstRow: rowWindow(0, rowIndex, visibleRowsOf(deps), rows.length),
  });
}

/** Regular OK / cell-menu Play channel: tune, then jump to fullscreen. */
export function playChannel(deps: GuideControllerDeps, channel: ChannelRow): void {
  deps.tuner.tune(channel);
  deps.onFullscreen();
}

/** Regular OK: play the focused row's channel fullscreen, or a playable past cell's archive. */
export function activateFocused(controller: GuideController, deps: GuideControllerDeps): void {
  const focus = controller.engine.focus;
  const row = controller.focusedRow();
  if (focus === null || row === undefined) return;
  const action = activate(row, focus.cell, controller.now);
  deps.tuner.tune(action.channel, action.kind === 'PlayCatchup' ? { catchupUrl: action.url } : {});
  deps.onFullscreen();
}

/** The Block/Unblock or locked-group PIN dialog's submit; a wrong PIN keeps the dialog up. */
export async function submitPin(
  controller: GuideController,
  deps: GuideControllerDeps,
  actions: GuideSheetActions,
  pin: string,
): Promise<void> {
  const layer = controller.layer;
  if (layer.kind === 'BlockPin') {
    if (await actions.submitBlockPin(pin, layer.mode, layer.channelId)) controller.menu.reset();
  } else if (layer.kind === 'GroupPin' && (await deps.parental.verifyPin(pin))) {
    if (controller.groupMemory.select(layer.group)) controller.engine.reset();
    controller.menu.reset();
  }
}

export function commandDeps(controller: GuideController, deps: GuideControllerDeps): GuideCommandDeps {
  return {
    engine: controller.engine,
    menu: controller.menu,
    rows: () => controller.rows,
    pastDays: () => pastDaysOf(deps),
    visibleRows: () => visibleRowsOf(deps),
    activate: () => activateFocused(controller, deps),
  };
}

export function clockStyleOf(deps: GuideControllerDeps): ClockStyle {
  return is24Raw(deps.settings.get(TellySettings.CLOCK_FORMAT)) ? CLOCK_24H : CLOCK_12H;
}
