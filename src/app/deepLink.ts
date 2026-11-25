import { type ChannelRow, displayName } from '@/core/db/types';

/**
 * Web-only launch link: `https://telly.jpc.io/?channel=<number | name | unique name prefix>`
 * tunes that channel straight into fullscreen playback. The request is read
 * ONCE at boot and stripped from the address bar (`history.replaceState`), so
 * a reload — or a TV browser restoring its last URL — never re-tunes. Other
 * params (`?e2e=1`) and the base path (`/telly-web/` on GitHub Pages) survive.
 */
export type LaunchLink = { kind: 'None' } | { kind: 'Channel'; query: string };

export const NO_LINK: LaunchLink = { kind: 'None' };

const CHANNEL_PARAM = 'channel';

/** The `?channel=` request in a `location.search`, trimmed; absent or blank is no link. */
export function launchLinkOf(search: string): LaunchLink {
  const query = new URLSearchParams(search).get(CHANNEL_PARAM)?.trim() ?? '';
  return query === '' ? NO_LINK : { kind: 'Channel', query };
}

/** The same address without `?channel=`; every other param, the path and the hash stay. */
export function withoutLaunchLink(location: Pick<Location, 'pathname' | 'search' | 'hash'>): string {
  const params = new URLSearchParams(location.search);
  params.delete(CHANNEL_PARAM);
  const search = params.toString();
  return `${location.pathname}${search === '' ? '' : `?${search}`}${location.hash}`;
}

/** Reads the link and strips it from the address bar, keeping the history entry's state. */
export function takeLaunchLink(win: Pick<Window, 'location' | 'history'> = window): LaunchLink {
  const link = launchLinkOf(win.location.search);
  if (link.kind === 'Channel') {
    win.history.replaceState(win.history.state, '', withoutLaunchLink(win.location));
  }
  return link;
}

/** The channel at `wanted` when it is all digits; a name that happens to be digits still gets its turn below. */
function byNumber(channels: readonly ChannelRow[], wanted: string): ChannelRow | null {
  if (!/^\d+$/.test(wanted)) return null;
  return channels.find((channel) => channel.number === Number(wanted)) ?? null;
}

interface NamedChannel {
  name: string;
  channel: ChannelRow;
}

/** The exact display name, else the one channel whose name starts with `wanted` (both lower-cased). */
function byName(channels: readonly ChannelRow[], wanted: string): ChannelRow | null {
  const named: NamedChannel[] = channels.map((channel) => ({
    name: displayName(channel).toLowerCase(),
    channel,
  }));
  return named.find(({ name }) => name === wanted)?.channel ?? uniquePrefix(named, wanted);
}

function uniquePrefix(named: readonly NamedChannel[], wanted: string): ChannelRow | null {
  const prefixed = named.filter(({ name }) => name.startsWith(wanted));
  return prefixed.length === 1 ? (prefixed[0]?.channel ?? null) : null;
}

/** Channel number first, then the exact display name (case-insensitive), then a unique name prefix. */
export function matchChannel(channels: readonly ChannelRow[], query: string): ChannelRow | null {
  const wanted = query.trim().toLowerCase();
  return byNumber(channels, wanted) ?? byName(channels, wanted);
}
