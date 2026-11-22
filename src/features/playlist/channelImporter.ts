import type { ChannelImport } from '@/core/db/channelReplace';
import { type ImportCounts, type PlaylistRepository, playlistRepository } from '@/core/db/playlistRepository';
import type { VodImport } from '@/core/db/vodRepository';
import { parseM3u } from './m3uParser';
import type { M3uChannel } from './m3uTypes';
import { isVod, vodItemKey } from './vodClassifier';

export { identityOf, keyOf } from '@/core/db/channelIdentity';

/** A live channel row as the database stores it (Android `ChannelImporter.import` mapping). */
export function toChannelImport(channel: M3uChannel): ChannelImport {
  return {
    name: channel.title,
    groupTitle: channel.groupTitle,
    logoUrl: channel.tvgLogo,
    streamUrl: channel.streamUrl,
    tvgId: channel.tvgId,
    catchupType: channel.catchup,
    catchupSource: channel.catchupSource,
    catchupDays: channel.catchupDays,
  };
}

/** A VOD row: group-title as the browser category, tvg-logo as the artwork (Android `VodImporter`). */
export function toVodImport(channel: M3uChannel): VodImport {
  return {
    itemKey: vodItemKey(channel.streamUrl, channel.title),
    name: channel.title,
    groupTitle: channel.groupTitle,
    logoUrl: channel.tvgLogo,
    streamUrl: channel.streamUrl,
  };
}

export interface ClassifiedEntries {
  live: ChannelImport[];
  vod: VodImport[];
}

/** Video-file entries are VOD "Movies", never guide channels. */
export function classifyEntries(channels: readonly M3uChannel[]): ClassifiedEntries {
  const out: ClassifiedEntries = { live: [], vod: [] };
  for (const channel of channels) {
    if (isVod(channel.streamUrl)) out.vod.push(toVodImport(channel));
    else out.live.push(toChannelImport(channel));
  }
  return out;
}

export interface ImportOptions {
  /** Null keeps the stored name (or derives one from the URL). */
  name?: string | null;
  clock?: () => number;
  playlists?: PlaylistRepository;
}

export interface ImportResult extends ImportCounts {
  epgUrl: string | null;
}

/** Parse -> classify -> one transactional swap of the playlist's channel + VOD rows. */
export async function importPlaylist(
  sourceUrl: string,
  content: string,
  options: ImportOptions = {},
): Promise<ImportResult> {
  const parsed = parseM3u(content);
  const { live, vod } = classifyEntries(parsed.channels);
  const repository = options.playlists ?? playlistRepository;
  const counts = await repository.add(
    sourceUrl,
    { epgUrl: parsed.epgUrl, channels: live, vodItems: vod },
    options.name ?? null,
    options.clock ?? ((): number => Date.now()),
  );
  return { ...counts, epgUrl: parsed.epgUrl };
}
