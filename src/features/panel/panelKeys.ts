import type { ChannelRow } from '@/core/db/types';
import type { RemoteKey } from '@/core/input/remoteKeys';
import type { PanelRow } from './panelRows';

/** The row list wraps at both ends like TiviMate's guide (round3 item 21). */
export function wrapIndexFor(key: RemoteKey, index: number, lastIndex: number): number | null {
  if (lastIndex <= 0) return null;
  if (key === 'DOWN' && index === lastIndex) return 0;
  if (key === 'UP' && index === 0) return lastIndex;
  return null;
}

/** The row a wrapping UP/DOWN lands on, or null for a normal focus move. */
export function wrapTargetFor(key: RemoteKey, rows: readonly PanelRow[], index: number): PanelRow | null {
  const wrap = wrapIndexFor(key, index, rows.length - 1);
  return wrap === null ? null : (rows[wrap] ?? null);
}

/** Index of `channelId` in `channels`, -1 when absent (or null). */
export function indexOfChannel(channels: readonly ChannelRow[], channelId: number | null): number {
  return channelId === null ? -1 : channels.findIndex((c) => c.id === channelId);
}

const ROW_PREFIX = 'panel-row-';

/** Focus/test id of a channel row. */
export function rowIdOf(channelId: number): string {
  return `${ROW_PREFIX}${channelId}`;
}

/** Focus/test id of a group row. */
export function groupIdOf(name: string): string {
  return `panel-group-${name}`;
}

/** Index of the row whose focus id is `focusId`, or -1 when focus is elsewhere. */
export function rowIndexOf(focusId: string | null, rows: readonly PanelRow[]): number {
  if (focusId === null || !focusId.startsWith(ROW_PREFIX)) return -1;
  const channelId = Number(focusId.slice(ROW_PREFIX.length));
  return rows.findIndex((row) => row.channel.id === channelId);
}

/**
 * Appearance -> Player -> "Panels transparency" scales today's 0.68 scrim
 * (0% = exactly today; Android `PanelStyle.scale`).
 */
export function scrimAlpha(extraTransparencyPercent: number): number {
  return 0.68 * (1 - extraTransparencyPercent / 100);
}

/** Appearance -> Logos, resolved to the logo tile fill (Android `LogoStyle.backgroundFor`). */
export function logoBackground(label: string): string {
  switch (label) {
    case 'Transparent':
      return 'transparent';
    case 'Dark':
      return '#262d38';
    case 'Light':
      return '#e0e2e4';
    default:
      return '#2c5f8a';
  }
}

/** Parental controls: the groups whose entry must be gated behind the PIN. */
export function lockedGroupsOf(
  groups: readonly string[],
  enabled: boolean,
  channelsOnly: boolean,
  locked: ReadonlySet<string>,
): ReadonlySet<string> {
  if (!enabled || channelsOnly) return new Set();
  return new Set(groups.filter((g) => locked.has(g)));
}

/** "News One" -> "NO": the logo tile's text behind a missing logo. */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => w !== '')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}
