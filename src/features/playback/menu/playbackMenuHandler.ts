import type { ChannelRow } from '@/core/db/types';
import type { Route } from '@/core/navigation/routes';
import { ALL_CHANNELS } from '@/core/channels/channelGroups';
import {
  type ChannelOptionsController,
  PlayerMenuFocus,
  type SheetFlagActions,
  type SheetItem,
  runChannelOption,
  runSheetItem,
} from '@/features/channelmenu';
import type { CustomGroup } from '@/features/groups/customGroups';
import type { GroupTools } from '@/features/groups/groupTools';
import type { PlaybackRecording } from '@/features/recording';
import { type PlaybackCommands, popTo, show } from '../overlay/playbackCommands';
import { afterAction, type PlaybackOverlay } from '../overlay/playbackOverlay';
import type { TuneController } from '../tune/tuneController';
import { playbackSheetHost } from './playbackSheetHost';

/** Where the sheet's navigation rows leave to (the host wires the navigator). */
export interface MenuNavigation {
  /** Pushes a route over the player (Search, Settings, the editors). */
  open(route: Route): void;
  /** The quick-bar's Search slot. */
  openSearch(): void;
  /** Web: a new tab/window on the stream URL — the honest "external player". */
  openExternal(url: string): void;
}

/** The persisting flag writes + PIN policy the sheet needs (test seam over `SheetActions`). */
export type FlagActions = SheetFlagActions;

export interface MenuHandlerDeps {
  actions: FlagActions;
  options: ChannelOptionsController;
  groupTools: GroupTools;
  commands: PlaybackCommands;
  tuner: Pick<TuneController, 'byId' | 'current'>;
  nav: MenuNavigation;
  /** "Add to My list": saves/removes the channel's AIRING programme. */
  toggleMyList: (channel: ChannelRow) => void;
  /** The DVR rows (Record / Custom recording) act through the host's recording adapter. */
  record: Pick<PlaybackRecording, 'onRecord' | 'onCustomRecording'>;
}

/**
 * Executes the panel sheet's rows through the shared routing table (Android
 * `PlaybackMenuHandler`): favorites/hide/block persist, Search and Settings
 * clear the overlay chrome first, pushed screens carry the sheet as `back`,
 * Channel options REPLACES the sheet so its BACK lands on the panel.
 */
export class PlaybackMenuHandler {
  readonly sheetFocus = new PlayerMenuFocus();
  private group = ALL_CHANNELS;
  private groups: readonly CustomGroup[] = [];

  constructor(readonly deps: MenuHandlerDeps) {}

  get overlay(): PlaybackOverlay {
    return this.deps.commands.overlay;
  }

  get options(): ChannelOptionsController {
    return this.deps.options;
  }

  /** The panel group the sheet was opened in (Reorder channels / Group options act on it). */
  get sheetGroup(): string {
    return this.group;
  }

  get customGroups(): readonly CustomGroup[] {
    return this.groups;
  }

  /** The custom groups the tools act on, fed by the host's live query while the sheet is up. */
  setCustomGroups(groups: readonly CustomGroup[]): void {
    this.groups = groups;
  }

  /** Long-OK on a panel row: a fresh sheet, focus reset to the first row. */
  openChannelMenu(channelId: number, group: string = ALL_CHANNELS): void {
    this.sheetFocus.clear();
    this.group = group;
    this.show({ kind: 'ChannelMenu', channelId });
  }

  /** The channel a menu action applies to, re-resolved from the live list so repeated actions see fresh flags. */
  menuChannel(): ChannelRow | null {
    const overlay = this.overlay;
    const id =
      overlay.kind === 'ChannelMenu' || overlay.kind === 'ChannelOptions'
        ? overlay.channelId
        : this.deps.tuner.current?.id;
    if (id === undefined) return null;
    return this.deps.tuner.byId(id) ?? this.deps.tuner.current;
  }

  onMenuItem(item: SheetItem): void {
    const channel = this.menuChannel();
    if (channel === null) return;
    this.sheetFocus.onActivated(item);
    runSheetItem(playbackSheetHost(this), this.deps.actions, item, channel);
  }

  /** A Channel-options pane row on the FRESH row the pane observes. */
  onChannelOption(channel: ChannelRow, rowId: string): void {
    runChannelOption(playbackSheetHost(this), this.deps.actions, this.deps.options, channel, rowId);
  }

  /** BACK on the pane closes an open rename/picker dialog first, then lands on the panel. */
  closeChannelOptions(): void {
    const overlay = this.overlay;
    if (overlay.kind !== 'ChannelOptions' || this.deps.options.closeDialog()) return;
    this.deps.commands.execute(popTo(overlay.back));
  }

  /** The Block/Unblock PIN dialog's commit: a verified (or freshly set) PIN flips the flag; a wrong PIN keeps the dialog up. */
  async submitBlockPin(pin: string): Promise<boolean> {
    const dialog = this.overlay;
    if (dialog.kind !== 'BlockPin') return false;
    const accepted = await this.deps.actions.submitBlockPin(pin, dialog.mode, dialog.channel.id);
    if (accepted) this.show(afterAction(dialog.back));
    return accepted;
  }

  show(next: PlaybackOverlay): void {
    this.deps.commands.execute(show(next));
  }
}
