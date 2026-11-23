import { useMemo, useState } from 'react';
import { type ChannelRow, epgId } from '@/core/db/types';
import { useFocusedId } from '@/core/focus/useFocusedId';
import { TellySettings } from '@/core/settings/tellySettings';
import { useSetting } from '@/core/settings/useSetting';
import { clockStyleOf } from '@/core/time';
import { useProgramsInRange } from '@/features/epg/useProgramsInRange';
import { ALL_CHANNELS, type PanelDeps, type PanelRow, panelDeps } from '@/features/panel';
import { indexOfChannel, rowIndexOf } from '@/features/panel/panelKeys';
import { useFocusCommand } from '@/features/panel/useFocusCommand';
import { type LogoStyle, usePanelModel } from '@/features/panel/usePanelModel';
import { FUTURE_MS, PAST_MS, buildSchedule, type MultiviewScheduleRow } from './multiviewSchedule';

export interface MultiviewPickerModel {
  rows: PanelRow[];
  logo: LogoStyle;
  /** The focused row feeds the schedule pane and the detail card. */
  focusedRow: PanelRow | null;
  schedule: MultiviewScheduleRow[];
}

/**
 * The channel picker every pane-menu row opens (Android `MultiviewPicker`):
 * the panel's "All channels" rows (reused 1:1 — the pane's current channel
 * carries the play arrow), the focused channel's schedule in the middle and
 * its airing programme's detail top-right. Opening focuses the pane's
 * current channel.
 */
export function useMultiviewPicker(
  channels: readonly ChannelRow[],
  currentChannelId: number | null,
  deps: PanelDeps = panelDeps,
): MultiviewPickerModel {
  const [atMs] = useState(deps.now);
  const model = usePanelModel({ channels }, ALL_CHANNELS, deps);
  const [command] = useState(() => ({
    version: 1,
    index: Math.max(0, indexOfChannel(channels, currentChannelId)),
  }));
  useFocusCommand(command, model.rows);
  const focusedRow = model.rows[rowIndexOf(useFocusedId(), model.rows)] ?? null;
  const [clockRaw] = useSetting(TellySettings.CLOCK_FORMAT);
  const style = useMemo(() => clockStyleOf(clockRaw), [clockRaw]);
  const tvgId = focusedRow === null ? null : epgId(focusedRow.channel);
  const ids = useMemo(() => (tvgId === null ? [] : [tvgId]), [tvgId]);
  const programs = useProgramsInRange(ids, atMs - PAST_MS, atMs + FUTURE_MS, deps.guide);
  const schedule = useMemo(() => buildSchedule(programs ?? [], atMs, style), [programs, atMs, style]);
  return { rows: model.rows, logo: model.logo, focusedRow, schedule };
}
