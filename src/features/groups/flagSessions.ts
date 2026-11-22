import type { ChannelRow } from '@/core/db/types';
import { displayName } from '@/core/db/types';
import type { ParentalControls } from '@/core/settings/parentalControls';
import { StaticSession } from './groupNameSessions';
import { type GroupToolLive, type GroupToolStore, type GroupToolUi, pinUi, rowsUi } from './groupToolSession';
import { type ToolRow, toggle, value } from './toolRows';

/**
 * "Assign EPG": a picker of every EPG channel id with stored data, "Auto
 * (tvg-id)" first. OK persists the per-channel override (channels.epgOverride).
 */
export class AssignEpgSession extends StaticSession {
  constructor(
    private readonly channel: ChannelRow,
    private readonly store: GroupToolStore,
    private readonly onDone: () => void,
  ) {
    super();
  }

  ui(live: GroupToolLive): GroupToolUi {
    const current = this.channel.epgOverride;
    const rows: ToolRow[] = [value('auto', 'Auto (tvg-id)', this.channel.tvgId, current === null)];
    for (const id of live.epgIds) rows.push(value(`epg:${id}`, id, null, current === id));
    return rowsUi('Assign EPG', rows);
  }

  override activate(rowId: string): void {
    const override = rowId === 'auto' ? null : rowId.startsWith('epg:') ? rowId.slice(4) : undefined;
    if (override === undefined) return;
    void this.store.setEpgOverride(this.channel.id, override).then(this.onDone);
  }
}

/** Which per-channel flag a bulk editor manages. */
export type BulkFlagKind = 'Manage blocking' | 'Manage visibility';

/**
 * "Manage blocking" / "Manage visibility": EVERY channel with its
 * blocked/hidden state, OK toggles and persists immediately. The blocking
 * editor is gated once per entry behind the parental PIN when parental
 * controls are enabled with a PIN set.
 */
export class BulkFlagSession extends StaticSession {
  private locked: boolean;

  constructor(
    private readonly kind: BulkFlagKind,
    private readonly store: GroupToolStore,
    private readonly parental: ParentalControls,
  ) {
    super();
    this.locked = kind === 'Manage blocking' && parental.isEnabled && parental.hasPin;
  }

  ui(live: GroupToolLive): GroupToolUi {
    if (this.locked) return pinUi(this.kind);
    return rowsUi(
      this.kind,
      live.channels.map((c) => toggle(`channel:${c.id}`, displayName(c), this.flagOf(c))),
    );
  }

  override activate(rowId: string, live: GroupToolLive): void {
    if (this.locked || !rowId.startsWith('channel:')) return;
    const channel = live.channels.find((c) => c.id === Number(rowId.slice(8)));
    if (channel === undefined) return;
    const next = !this.flagOf(channel);
    void (this.kind === 'Manage blocking'
      ? this.store.setBlocked(channel.id, next)
      : this.store.setHidden(channel.id, next));
  }

  override async submitPin(pin: string): Promise<void> {
    if (!(await this.parental.verifyPin(pin))) return;
    this.locked = false;
    this.notify();
  }

  private flagOf(channel: ChannelRow): boolean {
    return this.kind === 'Manage blocking' ? channel.blocked : channel.hidden;
  }
}
