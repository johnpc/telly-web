import type { ChannelRow } from '@/core/db/types';
import type { Route } from '@/core/navigation/routes';
import type { ChannelOptionsController } from './channelOptionsController';
import { type PlayerMenuRoute, routeOf } from './menuRouting';
import type { BlockPinMode, SheetFlagActions } from './sheetActions';
import type { SheetItem } from './sheetMenu';

/**
 * What a sheet host (the guide grid, the playback panel) supplies so the ONE
 * dispatcher can run every row: how a finished row lands, how routes open,
 * and which layer each pushed screen becomes (Android `PlaybackMenuHandler`
 * / `GuideMenuController.onMenuItem`, now one function).
 */
export interface SheetHost {
  /** A row that acted: land back on the host's resting surface (grid / panel). */
  actThenReset(action: () => void): void;
  /** A row that leaves the host: chrome dismissed first, then the route. */
  open(route: Route): void;
  /** The group "Reorder channels" and the group tools act on. */
  selectedGroup(): string;
  pushBlockPin(channel: ChannelRow, mode: BlockPinMode): void;
  pushDescription(channel: ChannelRow): void;
  /** Replaces the sheet; its BACK lands on the host, never back on the sheet. */
  showChannelOptions(channel: ChannelRow): void;
  openGroupTool(item: SheetItem, channel: ChannelRow): void;
  record(channel: ChannelRow): void;
  customRecording(channel: ChannelRow): void;
  toggleMyList(channel: ChannelRow): void;
  openExternal(channel: ChannelRow): void;
}

type Run = (host: SheetHost, actions: SheetFlagActions, channel: ChannelRow, item: SheetItem) => void;

const tool: Run = (host, _actions, channel, item) => host.openGroupTool(item, channel);

const RUNS: Readonly<Record<PlayerMenuRoute, Run>> = {
  Search: (host) => host.open({ kind: 'Search' }),
  Settings: (host) => host.open({ kind: 'Settings' }),
  ManageFavorites: (host) => host.open({ kind: 'ManageFavorites' }),
  ReorderChannels: (host) => host.open({ kind: 'ReorderChannels', group: host.selectedGroup() }),
  ToggleFavorite: (host, actions, channel) => host.actThenReset(() => void actions.toggleFavorite(channel)),
  HideChannel: (host, actions, channel) => host.actThenReset(() => void actions.hide(channel)),
  ExternalPlayer: (host, _actions, channel) => host.actThenReset(() => host.openExternal(channel)),
  MyListToggle: (host, _actions, channel) => host.actThenReset(() => host.toggleMyList(channel)),
  ToggleBlock: (host, actions, channel) => host.pushBlockPin(channel, actions.blockMode()),
  Description: (host, _actions, channel) => host.pushDescription(channel),
  ChannelOptions: (host, _actions, channel) => host.showChannelOptions(channel),
  Record: (host, _actions, channel) => host.record(channel),
  CustomRecording: (host, _actions, channel) => host.customRecording(channel),
  CreateGroup: tool,
  GroupOptions: tool,
  CopyChannels: tool,
  AssignEpg: tool,
  ManageBlocking: tool,
  ManageVisibility: tool,
};

/** Runs one sheet row for `channel` through the shared routing table. */
export function runSheetItem(
  host: SheetHost,
  actions: SheetFlagActions,
  item: SheetItem,
  channel: ChannelRow,
): void {
  RUNS[routeOf(item)](host, actions, channel, item);
}

/**
 * A Channel-options pane row routed through the shared controller; the
 * effects the pane cannot finish alone reuse the sheet's own flows (Block →
 * the PIN dialog, Hide → zap-away + hide, the names editor → its route).
 */
export function runChannelOption(
  host: SheetHost,
  actions: SheetFlagActions,
  options: ChannelOptionsController,
  channel: ChannelRow,
  rowId: string,
): void {
  const effect = options.onRow(channel, rowId);
  if (effect === 'BLOCK') host.pushBlockPin(channel, actions.blockMode());
  else if (effect === 'HIDE') host.actThenReset(() => void actions.hide(channel));
  else if (effect === 'NAMES_EDITOR') host.open({ kind: 'ChannelNamesEditor' });
}
