import { keyOf } from '@/core/db/channelIdentity';
import { type ChannelRow, displayName } from '@/core/db/types';
import type { CustomGroup } from './customGroups';
import { StaticSession } from './groupNameSessions';
import { type GroupToolLive, type GroupToolStore, type GroupToolUi, rowsUi } from './groupToolSession';
import { type ToolRow, action, note, toggle } from './toolRows';

/**
 * "Copy channels": pick the target custom group (skipped when exactly one
 * exists), then check channels — OK toggles a row, the explicit Done row
 * copies the checked channels into the group by refresh-stable key.
 */
export class CopyChannelsSession extends StaticSession {
  private target: CustomGroup | null;
  private readonly selection = new Set<number>();

  constructor(
    private readonly groups: readonly CustomGroup[],
    private readonly store: GroupToolStore,
    private readonly onDone: () => void,
  ) {
    super();
    this.target = groups.length === 1 ? (groups[0] ?? null) : null;
  }

  ui(live: GroupToolLive): GroupToolUi {
    if (this.groups.length === 0) return rowsUi('Copy channels', [note('Create a custom group first')]);
    const into = this.target;
    if (into === null) {
      return rowsUi(
        'Copy channels to',
        this.groups.map((g) => action(`group:${g.id}`, g.name)),
      );
    }
    const rows: ToolRow[] = [action('done', 'Done')];
    for (const channel of live.channels) if (!channel.hidden) rows.push(this.channelRow(channel));
    return rowsUi(`Copy channels to ${into.name}`, rows);
  }

  override activate(rowId: string, live: GroupToolLive): void {
    const id = Number(rowId.slice(rowId.indexOf(':') + 1));
    if (rowId === 'done') this.commit(live);
    else if (rowId.startsWith('group:')) this.pickTarget(id);
    else if (rowId.startsWith('channel:')) this.toggleChannel(id);
  }

  private pickTarget(id: number): void {
    this.target = this.groups.find((g) => g.id === id) ?? null;
    this.notify();
  }

  private toggleChannel(id: number): void {
    if (this.selection.has(id)) this.selection.delete(id);
    else this.selection.add(id);
    this.notify();
  }

  private commit(live: GroupToolLive): void {
    const into = this.target;
    if (into === null) return;
    const keys = live.channels.filter((c) => this.selection.has(c.id)).map(keyOf);
    void this.store.addMembers(into.id, keys).then(this.onDone);
  }

  private channelRow(channel: ChannelRow): ToolRow {
    return toggle(`channel:${channel.id}`, displayName(channel), this.selection.has(channel.id));
  }
}
