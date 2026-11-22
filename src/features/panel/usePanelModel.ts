import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState, useSyncExternalStore } from 'react';
import type { NowNext } from '@/core/db/programRepository';
import { useSettingsRepository } from '@/core/settings/settingsContext';
import { TellySettings } from '@/core/settings/tellySettings';
import { useSetting } from '@/core/settings/useSetting';
import { useNowNext } from '@/features/epg/useNowNext';
import type { PlaybackSession } from '@/features/playback/tune';
import { type PanelDeps, panelDeps } from './panelDeps';
import { lockedGroupsOf, logoBackground, scrimAlpha } from './panelKeys';
import { type CustomGroup, channelsIn, groupNames, toCustomGroups, visibleGroups } from './panelGroups';
import { type PanelRow, buildRows, epgIdsOf } from './panelRows';
import { is24Raw } from '@/features/playback/info/clockStyle';
import { ProgramTimes } from '@/features/playback/info/programTimes';

export interface LogoStyle {
  background: string;
  rounded: boolean;
}

/** Everything the panel renders for one selected group, derived from live data + settings. */
export interface PanelModel {
  groups: string[];
  lockedGroups: ReadonlySet<string>;
  rows: PanelRow[];
  clockText: string;
  /** Scrim alpha over the video (Appearance -> Player -> Panels transparency). */
  scrim: number;
  logo: LogoStyle;
}

const NO_GUIDE: ReadonlyMap<string, NowNext> = new Map();
const NO_CUSTOM: readonly CustomGroup[] = [];

function useCustomGroups(deps: PanelDeps): readonly CustomGroup[] {
  const custom = useLiveQuery(async () => {
    const [groups, members] = await Promise.all([deps.customGroups.groups(), deps.customGroups.members()]);
    return toCustomGroups(groups, members);
  }, [deps]);
  return custom ?? NO_CUSTOM;
}

/**
 * The locked-groups setting read through its ENCODED form: a decoded Set is
 * a fresh object per read, which `useSyncExternalStore` would loop on.
 */
function useLockedGroupNames(): ReadonlySet<string> {
  const repository = useSettingsRepository();
  const setting = TellySettings.PARENTAL_LOCKED_GROUPS;
  const raw = useSyncExternalStore(
    (onChange) => repository.observe(setting, onChange),
    () => setting.encode(repository.get(setting)),
  );
  return useMemo(() => setting.decode(raw), [setting, raw]);
}

function useLockedGroups(groups: readonly string[]): ReadonlySet<string> {
  const [enabled] = useSetting(TellySettings.PARENTAL_ENABLED);
  const [channelsOnly] = useSetting(TellySettings.PARENTAL_CHANNELS_ONLY);
  const locked = useLockedGroupNames();
  return useMemo(
    () => lockedGroupsOf(groups, enabled, channelsOnly, locked),
    [groups, enabled, channelsOnly, locked],
  );
}

/** Groups + rows of `selectedGroup` with now/next (Android `PanelViewModel.groups`/`rows`). "Now" is sampled when the panel opens. */
export function usePanelModel(
  session: PlaybackSession,
  selectedGroup: string,
  deps: PanelDeps = panelDeps,
): PanelModel {
  const [atMs] = useState(deps.now);
  const custom = useCustomGroups(deps);
  const [showAll] = useSetting(TellySettings.SHOW_ALL_CHANNELS_GROUP);
  const [showFavorites] = useSetting(TellySettings.SHOW_FAVORITES_GROUP);
  const [clockFormat] = useSetting(TellySettings.CLOCK_FORMAT);
  const [transparency] = useSetting(TellySettings.PLAYER_TRANSPARENCY);
  const [logoLabel] = useSetting(TellySettings.LOGO_BACKGROUND);
  const [rounded] = useSetting(TellySettings.LOGO_ROUNDED_CORNERS);
  const { channels } = session;
  const groups = useMemo(
    () => visibleGroups(groupNames(channels, custom), showAll, showFavorites),
    [channels, custom, showAll, showFavorites],
  );
  const lockedGroups = useLockedGroups(groups);
  const groupChannels = useMemo(
    () => channelsIn(channels, selectedGroup, custom),
    [channels, selectedGroup, custom],
  );
  const ids = useMemo(() => epgIdsOf(groupChannels), [groupChannels]);
  const guide = useNowNext(ids, atMs, deps.guide) ?? NO_GUIDE;
  const style = useMemo(() => ({ is24h: is24Raw(clockFormat) }), [clockFormat]);
  const rows = useMemo(
    () => buildRows(groupChannels, selectedGroup, guide, atMs, style),
    [groupChannels, selectedGroup, guide, atMs, style],
  );
  return {
    groups,
    lockedGroups,
    rows,
    clockText: ProgramTimes.clock(atMs, style),
    scrim: scrimAlpha(transparency),
    logo: { background: logoBackground(logoLabel), rounded },
  };
}
