import type { ChannelRow } from '@/core/db/types';
import type { PlaybackRecording } from '@/features/recording';
import type { ChannelBlocker } from '../gate/channelBlocker';
import { DISMISS, type PlaybackCommands, show } from '../overlay/playbackCommands';
import { afterAction, type PlaybackOverlay } from '../overlay/playbackOverlay';
import type { TuneController } from '../tune/tuneController';
import type { ChannelActions } from './channelActions';
import type { PlayerMenuItem } from './playerMenu';
import { PlayerMenuFocus, type PlayerMenuRoute, routeOf } from './playerMenuRouting';

/** Where the sheet's navigation rows leave to (the host wires the navigator). */
export interface MenuNavigation {
  openSearch(): void;
  openSettings(): void;
  openManageFavorites(): void;
  openReorderChannels(group: string): void;
  /** Web: a new tab/window on the stream URL — the honest "external player". */
  openExternal(url: string): void;
}

/** The persisting flag writes the sheet needs. */
export type FlagActions = Pick<ChannelActions, 'toggleFavorite' | 'hide' | 'toggleBlocked'>;

export interface MenuHandlerDeps {
  actions: FlagActions;
  blocker: ChannelBlocker;
  commands: PlaybackCommands;
  tuner: Pick<TuneController, 'byId' | 'current' | 'zapAwayFrom'>;
  nav: MenuNavigation;
  /** The DVR rows (Record / Custom recording) act through the host's recording adapter; absent (tests): placeholder. */
  record?: Pick<PlaybackRecording, 'onRecord' | 'onCustomRecording'> | undefined;
}

/**
 * Executes the panel sheet's rows through the shared routing table
 * (Android `PlaybackMenuHandler`): favorites/hide/block persist, Search and
 * Settings clear the overlay chrome first, Program description pushes a
 * screen whose BACK pops back to the sheet.
 */
export class PlaybackMenuHandler {
  readonly sheetFocus = new PlayerMenuFocus();

  constructor(private readonly deps: MenuHandlerDeps) {}

  get overlay(): PlaybackOverlay {
    return this.deps.commands.overlay;
  }

  /** Long-OK on a panel row: a fresh sheet, focus reset to the first row. */
  openChannelMenu(channelId: number): void {
    this.sheetFocus.clear();
    this.deps.commands.execute(show({ kind: 'ChannelMenu', channelId }));
  }

  /** The channel a menu action applies to, re-resolved from the live list so repeated actions see fresh flags. */
  menuChannel(): ChannelRow | null {
    const overlay = this.overlay;
    const id = overlay.kind === 'ChannelMenu' ? overlay.channelId : this.deps.tuner.current?.id;
    if (id === undefined) return null;
    return this.deps.tuner.byId(id) ?? this.deps.tuner.current;
  }

  onMenuItem(item: PlayerMenuItem): void {
    const channel = this.menuChannel();
    if (channel === null) return;
    this.sheetFocus.onActivated(item);
    const route = routeOf(item);
    if (!this.navigate(route, channel) && !this.persist(route, channel)) this.pushFor(route, item, channel);
  }

  /** Rows that leave the player: Search, Settings, the favorites/reorder screens. True when handled. */
  private navigate(route: PlayerMenuRoute, channel: ChannelRow): boolean {
    const { nav } = this.deps;
    const opens: Partial<Record<PlayerMenuRoute, () => void>> = {
      Search: () => nav.openSearch(),
      Settings: () => nav.openSettings(),
      ManageFavorites: () => nav.openManageFavorites(),
      ReorderChannels: () => nav.openReorderChannels(channel.groupTitle ?? ''),
    };
    const open = opens[route];
    if (open === undefined) return false;
    this.deps.commands.execute(DISMISS);
    open();
    return true;
  }

  /** Rows that persist a flag (or hand the stream off) and land on the panel. True when handled. */
  private persist(route: PlayerMenuRoute, channel: ChannelRow): boolean {
    const { actions, tuner, nav } = this.deps;
    if (route === 'ToggleFavorite') void actions.toggleFavorite(channel);
    else if (route === 'HideChannel') {
      tuner.zapAwayFrom(channel);
      void actions.hide(channel);
    } else if (route === 'ExternalPlayer') nav.openExternal(channel.streamUrl);
    else return false;
    this.deps.commands.execute(show(afterAction(this.overlay)));
    return true;
  }

  /** Pushed screens remember the overlay behind them; BACK pops to it. */
  private pushFor(route: PlayerMenuRoute, item: PlayerMenuItem, channel: ChannelRow): void {
    const back = this.overlay;
    if (route === 'ToggleBlock')
      return this.show({ kind: 'BlockPin', channel, mode: this.deps.blocker.mode(), back });
    if (route === 'Description') return this.show({ kind: 'Description', channel, back });
    const { record } = this.deps;
    if (route === 'Record' && record !== undefined) return record.onRecord(channel);
    if (route === 'CustomRecording' && record !== undefined) return record.onCustomRecording(channel);
    this.show({ kind: 'ComingSoon', feature: item, back });
  }

  private show(next: PlaybackOverlay): void {
    this.deps.commands.execute(show(next));
  }

  /** The Block/Unblock PIN dialog's commit: a verified (or freshly set) PIN flips the flag; a wrong PIN keeps the dialog up. */
  async submitBlockPin(pin: string): Promise<boolean> {
    const dialog = this.overlay;
    if (dialog.kind !== 'BlockPin') return false;
    const accepted = await this.deps.blocker.submit(pin, dialog.mode, dialog.channel);
    if (accepted) this.deps.commands.execute(show(afterAction(dialog.back)));
    return accepted;
  }
}
