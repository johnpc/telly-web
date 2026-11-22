import type { ChannelRepository } from '@/core/db/channelRepository';
import { type ChannelOverrides, type ChannelRow, displayName } from '@/core/db/types';
import { OPTION } from './channelOptionsRows';
import { type ChannelOptionsPicker, decoderRawOf, externalEffective } from './channelOptionsValues';
import { Observable } from './observable';

/** The pane's in-pane dialogs: the rename editor and the value pickers. */
export type ChannelOptionsDialog =
  | { kind: 'Rename'; channelId: number; initial: string }
  | { kind: 'Picker'; channelId: number; picker: ChannelOptionsPicker };

/** Rows the pane cannot finish alone; the HOST runs its existing flow. */
export type ChannelOptionsEffect = 'BLOCK' | 'HIDE' | 'NAMES_EDITOR';

const EFFECTS: Readonly<Partial<Record<string, ChannelOptionsEffect>>> = {
  [OPTION.BLOCK]: 'BLOCK',
  [OPTION.HIDE]: 'HIDE',
  [OPTION.NAMES_EDITOR]: 'NAMES_EDITOR',
};
const PICKERS: Readonly<Partial<Record<string, ChannelOptionsPicker>>> = {
  [OPTION.AUDIO_DECODER]: 'Audio decoder',
  [OPTION.VIDEO_DECODER]: 'Video decoder',
  [OPTION.EPG_OFFSET]: 'EPG time offset, h:min',
};

/** The override a picker pick writes; null for an unparseable offset. */
function pickedOverride(picker: ChannelOptionsPicker, raw: string): Partial<ChannelOverrides> | null {
  if (picker === 'Audio decoder') return { audioDecoder: decoderRawOf(raw) };
  if (picker === 'Video decoder') return { videoDecoder: decoderRawOf(raw) };
  return /^-?\d+$/.test(raw) ? { epgOffsetMinutes: Number(raw) } : null;
}

/**
 * The Channel-options pane's state machine (Android `ChannelOptionsController`
 * + `ChannelOptionsStore`): opens/answers the rename and picker dialogs and
 * writes partial overrides, so consecutive edits never clobber each other.
 */
export class ChannelOptionsController extends Observable {
  private open: ChannelOptionsDialog | null = null;

  constructor(
    private readonly channels: ChannelRepository,
    private readonly externalDefault: () => boolean,
  ) {
    super();
  }

  get dialog(): ChannelOptionsDialog | null {
    return this.open;
  }

  /** A pane row activation; non-null = the host finishes the flow. */
  onRow(channel: ChannelRow, rowId: string): ChannelOptionsEffect | null {
    const picker = PICKERS[rowId];
    if (picker !== undefined) this.show({ kind: 'Picker', channelId: channel.id, picker });
    else if (rowId === OPTION.NAME)
      this.show({ kind: 'Rename', channelId: channel.id, initial: displayName(channel) });
    else if (rowId === OPTION.RESTORE_NAME)
      void this.channels.updateOverrides(channel.id, { customName: null });
    else if (rowId === OPTION.EXTERNAL_PLAYER) void this.toggleExternal(channel);
    return EFFECTS[rowId] ?? null;
  }

  /** Commit of the rename dialog; blank restores the playlist name. */
  submitRename(text: string): void {
    if (this.open?.kind !== 'Rename') return;
    const name = text.trim();
    void this.channels.updateOverrides(this.open.channelId, { customName: name === '' ? null : name });
    this.show(null);
  }

  /** A picker row pick, dispatched by the open dialog's kind. */
  choose(raw: string): void {
    if (this.open?.kind !== 'Picker') return;
    const change = pickedOverride(this.open.picker, raw);
    if (change !== null) void this.channels.updateOverrides(this.open.channelId, change);
    this.show(null);
  }

  /** BACK closes an open dialog first; false = nothing was open. */
  closeDialog(): boolean {
    const wasOpen = this.open !== null;
    this.show(null);
    return wasOpen;
  }

  /** Flips the EFFECTIVE state into an explicit per-channel override, off the FRESH row. */
  private async toggleExternal(channel: ChannelRow): Promise<void> {
    const fresh = (await this.channels.byId(channel.id)) ?? channel;
    const next = externalEffective(fresh, this.externalDefault()) ? 'Off' : 'On';
    await this.channels.updateOverrides(channel.id, { externalPlayer: next });
  }

  private show(dialog: ChannelOptionsDialog | null): void {
    this.open = dialog;
    this.notify();
  }
}
