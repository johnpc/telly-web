import type { ChannelRow } from '@/core/db/types';
import {
  ChannelOptionsController,
  SheetActions,
  type SheetItem,
  externalDefaultOf,
} from '@/features/channelmenu';
import { type GuideRecording, createGuideRecording } from '@/features/recording';
import { type CellActionDeps, onCellAction } from './guideCellMenuActions';
import type { GuideCommandDeps } from './guideCommands';
import type { GuideController, GuideControllerDeps } from './guideController';
import { clockStyleOf, commandDeps, playChannel, submitPin } from './guideControllerFlows';
import { type GuideInfoData, infoFor } from './guideInfoBuilder';
import { type SheetActionDeps, onChannelOption, onSheetItem } from './guideMenuActions';
import type { GuideCellAction } from './guideModel';
import type { ClockStyle } from './guideTimes';

/** The controller's collaborators, built apart to keep `GuideController` small. */
export interface GuideParts {
  options: ChannelOptionsController;
  actions: SheetActions;
  commands: GuideCommandDeps;
  clockStyle(): ClockStyle;
  info(): GuideInfoData | null;
  onCellAction(action: GuideCellAction): void;
  onSheetItem(item: SheetItem): void;
  onChannelOption(channel: ChannelRow, rowId: string): void;
  /** The Block/Unblock or locked-group PIN dialog's submit; a wrong PIN keeps the dialog up. */
  submitPin(pin: string): Promise<void>;
  /** The DVR adapter the sheet / dropdown Record rows and the pushed DVR layers act through. */
  recording: GuideRecording;
}

type Core = Pick<GuideParts, 'options' | 'actions' | 'info' | 'recording'>;

function sheetDeps(controller: GuideController, deps: GuideControllerDeps, core: Core): SheetActionDeps {
  return {
    menu: controller.menu,
    actions: core.actions,
    options: core.options,
    groupTools: deps.groupTools,
    info: core.info,
    selectedGroup: () => controller.selectedGroup,
    customGroups: () => controller.customGroups,
    open: deps.open,
    toggleMyList: (channel) => {
      const program = controller.engine.focus?.cell.program ?? null;
      if (program !== null) void deps.seams.toggleMyList(channel, program);
    },
    openExternal: deps.seams.openExternal,
    recording: core.recording,
  };
}

function cellDeps(controller: GuideController, deps: GuideControllerDeps, core: Core): CellActionDeps {
  return {
    menu: controller.menu,
    recording: core.recording,
    now: deps.now,
    focusedRow: () => controller.focusedRow(),
    playChannel: (channel) => playChannel(deps, channel),
    toggleReminder: (channel, program) => void deps.seams.toggleReminder(channel, program),
    toggleMyList: (channel, program) => void deps.seams.toggleMyList(channel, program),
  };
}

/** The sheet's and the Channel-options pane's row activations, resolved against the focused row / open pane. */
function rowHandlers(
  controller: GuideController,
  sheet: SheetActionDeps,
): Pick<GuideParts, 'onSheetItem' | 'onChannelOption'> {
  return {
    onSheetItem: (item) => {
      const row = controller.focusedRow();
      if (row !== undefined) onSheetItem(sheet, item, row.channel);
    },
    onChannelOption: (channel, rowId) => onChannelOption(sheet, channel, rowId),
  };
}

export function buildParts(controller: GuideController, deps: GuideControllerDeps): GuideParts {
  const options = new ChannelOptionsController(deps.channels, () => externalDefaultOf(deps.settings));
  const actions = new SheetActions(deps.channels, deps.parental, (channel) =>
    deps.tuner.zapAwayFrom(channel),
  );
  const info = (): GuideInfoData | null =>
    infoFor(controller.rows, controller.engine.focus, controller.now, clockStyleOf(deps));
  const recording = createGuideRecording({
    show: (layer) => controller.menu.show(layer),
    layer: () => controller.menu.layer,
    clock: deps.now,
  });
  const core: Core = { options, actions, info, recording };
  const sheet = sheetDeps(controller, deps, core);
  return {
    options,
    actions,
    info,
    recording,
    clockStyle: () => clockStyleOf(deps),
    commands: commandDeps(controller, deps),
    onCellAction: (action) => onCellAction(cellDeps(controller, deps, core), action),
    ...rowHandlers(controller, sheet),
    submitPin: (pin) => submitPin(controller, deps, actions, pin),
  };
}
