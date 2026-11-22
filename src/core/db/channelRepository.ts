import { byFavoriteOrder, byNumber, byZapOrder, isVisible } from './channelOrder';
import { type ChannelImport, replaceChannelsForPlaylist } from './channelReplace';
import { type TellyDb, VISIBILITY_EPOCH_KEY, tellyDb } from './tellyDb';
import { type ChannelFlags, type ChannelOverrides, type ChannelRow, epgId } from './types';

/** One row of the guide's group list: a group name plus its channel count. */
export interface ChannelGroupCount {
  groupTitle: string | null;
  channelCount: number;
}

/** A channel's non-zero "EPG time offset", keyed by its EFFECTIVE EPG id. */
export interface TvgOffset {
  tvgId: string;
  epgOffsetMinutes: number;
}

function countByGroup(rows: readonly ChannelRow[]): Map<string | null, number> {
  const counts = new Map<string | null, number>();
  for (const row of rows) counts.set(row.groupTitle, (counts.get(row.groupTitle) ?? 0) + 1);
  return counts;
}

/** Persistence for channels; queries shaped like Android's `ChannelDao` + `ChannelOptionsDao`. */
/**
 * Android `PlaylistGroupFilter`: drops the channels of disabled playlist groups
 * from the visible feed. Ungrouped channels and unknown playlists stay visible.
 */
export type GroupEnabled = (playlistUrl: string, group: string) => boolean;

export function filterByEnabledGroups(
  channels: ChannelRow[],
  playlistUrlById: ReadonlyMap<number, string>,
  groupEnabled: GroupEnabled,
): ChannelRow[] {
  return channels.filter((channel) => {
    const url = playlistUrlById.get(channel.playlistId);
    return channel.groupTitle === null || url === undefined || groupEnabled(url, channel.groupTitle);
  });
}

export class ChannelRepository {
  private groupEnabled: GroupEnabled = () => true;

  constructor(private readonly db: TellyDb = tellyDb) {}

  /** Installs the settings-backed "Manage groups" predicate (the app shell does this once). */
  setGroupFilter(groupEnabled: GroupEnabled): void {
    this.groupEnabled = groupEnabled;
  }

  /** Every channel of a playlist, hidden included, in number order. */
  async forPlaylist(playlistId: number): Promise<ChannelRow[]> {
    return (await this.db.channels.where('playlistId').equals(playlistId).toArray()).sort(byNumber);
  }

  /** Visible channels of one group in zap order. */
  async byGroup(playlistId: number, groupTitle: string): Promise<ChannelRow[]> {
    const rows = await this.db.channels
      .where('[playlistId+groupTitle]')
      .equals([playlistId, groupTitle])
      .toArray();
    return rows.filter(isVisible).sort(byZapOrder);
  }

  /** The playlist's groups with visible-channel counts, ordered by first appearance. */
  async groups(playlistId: number): Promise<ChannelGroupCount[]> {
    const visible = (await this.forPlaylist(playlistId)).filter(isVisible).sort(byZapOrder);
    return [...countByGroup(visible)].map(([groupTitle, channelCount]) => ({ groupTitle, channelCount }));
  }

  /** All visible channels across playlists in "All channels" zap order (disabled groups dropped). */
  async visible(): Promise<ChannelRow[]> {
    // Reading the epoch row registers a live-query dependency so a Manage-groups change re-runs it.
    await this.db.meta.get(VISIBILITY_EPOCH_KEY);
    const urls = new Map((await this.db.playlists.toArray()).map((p) => [p.id, p.url] as const));
    const rows = (await this.db.channels.toArray()).filter(isVisible).sort(byZapOrder);
    return filterByEnabledGroups(rows, urls, this.groupEnabled);
  }

  /** EVERY channel, hidden included — the bulk visibility/blocking editors. */
  async all(): Promise<ChannelRow[]> {
    return (await this.db.channels.toArray()).sort(byNumber);
  }

  /** Visible favorites in Manage-Favorites order. */
  async favorites(): Promise<ChannelRow[]> {
    return (await this.visible()).filter((row) => row.favorite).sort(byFavoriteOrder);
  }

  totalCount(): Promise<number> {
    return this.db.channels.count();
  }

  async byId(id: number): Promise<ChannelRow | null> {
    return (await this.db.channels.get(id)) ?? null;
  }

  /** The visible channel at `number` (digit-entry zap), or null. */
  async byNumber(number: number): Promise<ChannelRow | null> {
    const rows = (await this.db.channels.where('number').equals(number).toArray()).filter(isVisible);
    return rows.sort(byZapOrder)[0] ?? null;
  }

  /** The non-zero per-channel EPG offsets the lookup layer applies. */
  async epgOffsets(): Promise<TvgOffset[]> {
    const out: TvgOffset[] = [];
    for (const row of await this.all()) {
      const tvgId = epgId(row);
      if (row.epgOffsetMinutes !== 0 && tvgId !== null)
        out.push({ tvgId, epgOffsetMinutes: row.epgOffsetMinutes });
    }
    return out;
  }

  updateFlags(id: number, flags: Partial<ChannelFlags>): Promise<number> {
    return this.db.channels.update(id, flags);
  }

  updateOverrides(id: number, overrides: Partial<ChannelOverrides>): Promise<number> {
    return this.db.channels.update(id, overrides);
  }

  /** Channel-options edits write back a whole fresh copy of the row. */
  async update(channel: ChannelRow): Promise<void> {
    await this.db.channels.put(channel);
  }

  replaceForPlaylist(playlistId: number, incoming: readonly ChannelImport[]): Promise<number> {
    return replaceChannelsForPlaylist(this.db, playlistId, incoming);
  }

  deleteForPlaylist(playlistId: number): Promise<number> {
    return this.db.channels.where('playlistId').equals(playlistId).delete();
  }
}

export const channelRepository = new ChannelRepository();
