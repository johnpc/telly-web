import type { ChannelRow } from '@/core/db/types';
import type { Route } from '@/core/navigation/routes';
import {
  type ChannelOptionsController,
  type GroupToolHost,
  type SheetActions,
  type SheetHost,
  type SheetItem,
  openGroupTool,
  runChannelOption,
  runSheetItem,
} from '@/features/channelmenu';
import type { CustomGroup } from '@/features/groups/customGroups';
import type { GroupTools } from '@/features/groups/groupTools';
import type { GuideRecording } from '@/features/recording';
import type { GuideInfoData } from './guideInfoBuilder';
import { type GuideLayer, descriptionLayer } from './guideLayer';
import type { GuideMenuController } from './guideMenuController';

/** Everything the sheet rows reach outside the layer machine. */
export interface SheetActionDeps {
  menu: GuideMenuController;
  actions: SheetActions;
  options: ChannelOptionsController;
  groupTools: GroupTools;
  info: () => GuideInfoData | null;
  selectedGroup: () => string;
  customGroups: () => readonly CustomGroup[];
  open: (route: Route) => void;
  toggleMyList: (channel: ChannelRow) => void;
  openExternal: (channel: ChannelRow) => void;
  /** The DVR rows (Record / Custom recording) act through the guide's recording adapter. */
  recording: Pick<GuideRecording, 'record' | 'customRecording'>;
}

/** The guide as a tool host: a tool is its own layer over the sheet; a finished one lands on the grid. */
function toolHost(menu: GuideMenuController): GroupToolHost<GuideLayer> {
  return {
    current: () => menu.layer,
    show: (layer) => menu.show(layer),
    done: () => menu.reset(),
    toolLayer: (session) => ({ kind: 'GroupTool', session }),
    sessionOf: (layer) => (layer.kind === 'GroupTool' ? layer.session : null),
  };
}

/**
 * The guide as a sheet host (Android `GuideMenuController.onMenuItem`): rows
 * that act land back on the grid, pushed screens carry the sheet as their
 * `back`, Channel options REPLACES the sheet (its BACK lands on the grid).
 */
export function guideSheetHost(deps: SheetActionDeps): SheetHost {
  const { menu } = deps;
  return {
    actThenReset: (action) => menu.actThenReset(action),
    open: (route) => {
      menu.reset();
      deps.open(route);
    },
    selectedGroup: deps.selectedGroup,
    pushBlockPin: (channel, mode) =>
      menu.show({ kind: 'BlockPin', channelId: channel.id, mode, back: menu.layer }),
    pushDescription: () => menu.show(descriptionLayer(deps.info())),
    showChannelOptions: (channel) =>
      menu.show({ kind: 'ChannelOptions', channelId: channel.id, dialog: null }),
    openGroupTool: (item, channel) => {
      const input = { channel, group: deps.selectedGroup(), groups: deps.customGroups() };
      openGroupTool(toolHost(menu), deps.groupTools, item, input);
    },
    record: (channel) => deps.recording.record(channel),
    customRecording: (channel) => deps.recording.customRecording(channel),
    toggleMyList: deps.toggleMyList,
    openExternal: deps.openExternal,
  };
}

/** The sheet's row dispatch through the ONE routing table. */
export function onSheetItem(deps: SheetActionDeps, item: SheetItem, channel: ChannelRow): void {
  runSheetItem(guideSheetHost(deps), deps.actions, item, channel);
}

/** A Channel-options pane row on the FRESH row the pane observes. */
export function onChannelOption(deps: SheetActionDeps, channel: ChannelRow, rowId: string): void {
  runChannelOption(guideSheetHost(deps), deps.actions, deps.options, channel, rowId);
}
