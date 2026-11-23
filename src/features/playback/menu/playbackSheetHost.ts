import { type GroupToolHost, type SheetHost, openGroupTool } from '@/features/channelmenu';
import { DISMISS } from '../overlay/playbackCommands';
import { afterAction, type PlaybackOverlay } from '../overlay/playbackOverlay';
import type { PlaybackMenuHandler } from './playbackMenuHandler';

/** The player as a tool host: a tool is pushed over the sheet; a finished one lands where the sheet would have. */
function toolHost(menu: PlaybackMenuHandler): GroupToolHost<PlaybackOverlay> {
  const exit = afterAction(menu.overlay);
  return {
    current: () => menu.overlay,
    show: (next) => menu.show(next),
    done: () => menu.show(exit),
    toolLayer: (session) => ({ kind: 'GroupTool', session, back: menu.overlay }),
    sessionOf: (overlay) => (overlay.kind === 'GroupTool' ? overlay.session : null),
  };
}

/**
 * The playback panel as a sheet host (Android `PlaybackMenuHandler`): rows
 * that act land on the panel, pushed screens remember the overlay behind
 * them, routes dismiss the chrome first, Channel options replaces the sheet.
 */
export function playbackSheetHost(menu: PlaybackMenuHandler): SheetHost {
  const { deps } = menu;
  return {
    actThenReset: (action) => {
      action();
      menu.show(afterAction(menu.overlay));
    },
    open: (route) => {
      deps.commands.execute(DISMISS);
      deps.nav.open(route);
    },
    selectedGroup: () => menu.sheetGroup,
    pushBlockPin: (channel, mode) => menu.show({ kind: 'BlockPin', channel, mode, back: menu.overlay }),
    pushDescription: (channel) => menu.show({ kind: 'Description', channel, back: menu.overlay }),
    showChannelOptions: (channel) =>
      menu.show({ kind: 'ChannelOptions', channelId: channel.id, back: afterAction(menu.overlay) }),
    openGroupTool: (item, channel) => {
      const input = { channel, group: menu.sheetGroup, groups: menu.customGroups };
      openGroupTool(toolHost(menu), deps.groupTools, item, input);
    },
    record: (channel) => deps.record.onRecord(channel),
    customRecording: (channel) => deps.record.onCustomRecording(channel),
    toggleMyList: deps.toggleMyList,
    openExternal: (channel) => deps.nav.openExternal(channel.streamUrl),
  };
}
