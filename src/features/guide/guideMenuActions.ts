import type { ChannelRow } from '@/core/db/types';
import type { Route } from '@/core/navigation/routes';
import type { CustomGroup } from '@/features/groups/customGroups';
import type { GroupTools } from '@/features/groups/groupTools';
import type { ChannelOptionsController } from './channelOptionsController';
import { openGroupTool } from './guideGroupTools';
import type { GuideInfoData } from './guideInfoBuilder';
import { descriptionLayer } from './guideLayer';
import type { GuideMenuController } from './guideMenuController';
import type { GuideSheetActions } from './guideSheetActions';
import { GROUP_TOOL_ITEMS, type SheetItem } from './sheetMenu';

/** Everything the sheet rows reach outside the layer machine. */
export interface SheetActionDeps {
  menu: GuideMenuController;
  actions: GuideSheetActions;
  options: ChannelOptionsController;
  groupTools: GroupTools;
  info: () => GuideInfoData | null;
  selectedGroup: () => string;
  customGroups: () => readonly CustomGroup[];
  open: (route: Route) => void;
  toggleMyList: (channel: ChannelRow) => void;
  openExternal: (channel: ChannelRow) => void;
}

/** Rows that act and land back on the grid (round3-ref 05). */
function actThenReset(deps: SheetActionDeps, item: SheetItem, channel: ChannelRow): boolean {
  const { menu, actions } = deps;
  if (item === 'Add to Favorites') menu.actThenReset(() => void actions.toggleFavorite(channel));
  else if (item === 'Hide channel') menu.actThenReset(() => void actions.hide(channel));
  else if (item === 'Open in external player') menu.actThenReset(() => deps.openExternal(channel));
  else if (item === 'Add to My list') menu.actThenReset(() => deps.toggleMyList(channel));
  else return false;
  return true;
}

/** Rows that push another screen (the sheet closes first, like Search). */
function pushRoute(deps: SheetActionDeps, item: SheetItem): boolean {
  const routes: Partial<Record<SheetItem, Route>> = {
    Search: { kind: 'Search' },
    Settings: { kind: 'Settings' },
    'Manage Favorites': { kind: 'ManageFavorites' },
    'Reorder channels': { kind: 'ReorderChannels', group: deps.selectedGroup() },
  };
  const route = routes[item];
  if (route === undefined) return false;
  deps.menu.reset();
  deps.open(route);
  return true;
}

/**
 * The sheet's row dispatch (Android `GuideMenuController.onMenuItem`): every
 * row is live except Record / Custom recording, which open the branded
 * coming-soon placeholder until the recording slice lands.
 */
export function onSheetItem(deps: SheetActionDeps, item: SheetItem, channel: ChannelRow): void {
  const { menu } = deps;
  if (actThenReset(deps, item, channel) || pushRoute(deps, item)) return;
  if (item === 'Block channel')
    menu.show({ kind: 'BlockPin', channelId: channel.id, mode: deps.actions.blockMode(), back: menu.layer });
  else if (item === 'Program description') menu.show(descriptionLayer(deps.info()));
  else if (item === 'Channel options') menu.show({ kind: 'ChannelOptions', channelId: channel.id });
  else if (GROUP_TOOL_ITEMS.has(item)) {
    openGroupTool(menu, deps.groupTools, item, channel, deps.selectedGroup(), deps.customGroups());
  } else menu.comingSoon(item, menu.layer);
}

/** A Channel-options pane row routed through the shared controller; effects reuse the sheet's flows. */
export function onChannelOption(deps: SheetActionDeps, channel: ChannelRow, rowId: string): void {
  const effect = deps.options.onRow(channel, rowId);
  if (effect === 'BLOCK') {
    deps.menu.show({
      kind: 'BlockPin',
      channelId: channel.id,
      mode: deps.actions.blockMode(),
      back: deps.menu.layer,
    });
  } else if (effect === 'HIDE') deps.menu.actThenReset(() => void deps.actions.hide(channel));
  else if (effect === 'NAMES_EDITOR') {
    deps.menu.reset();
    deps.open({ kind: 'ChannelNamesEditor' });
  }
}
