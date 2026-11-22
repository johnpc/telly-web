import type { ChannelSource } from './types';

/**
 * Stable identity used to carry user flags, custom-group membership, watch
 * history and My-list entries across playlist refreshes (port of Android
 * `ChannelImporter.identityOf`): the tvg-id when present, else stream URL +
 * name. Row ids are reassigned on every import, so nothing keys on them.
 */
export function identityOf(tvgId: string | null | undefined, streamUrl: string, name: string): string {
  return tvgId !== undefined && tvgId !== null && tvgId.trim() !== '' ? tvgId : `${streamUrl}|${name}`;
}

/** `identityOf` for a stored or incoming row. */
export function keyOf(channel: Pick<ChannelSource, 'tvgId' | 'streamUrl' | 'name'>): string {
  return identityOf(channel.tvgId, channel.streamUrl, channel.name);
}
