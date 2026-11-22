import { useEffect, useMemo } from 'react';
import type { ChannelRow, ProgramRow } from '@/core/db/types';
import { type GuideQueryDeps, defaultGuideDeps, useProgramsInRange } from '@/features/epg/useProgramsInRange';
import type { CustomGroup } from '@/features/groups/customGroups';
import type { GuideController } from './guideController';
import { TIME_VIEWPORT_DP } from './guideGeometry';
import type { GuideRow } from './guideModel';
import { buildRows, channelsIn, epgIdsOf, groupNames } from './guideRowsBuilder';
import { type GuideSpan, materializeSpan } from './guideWindowMath';

const NO_ROWS: GuideRow[] = [];

/** The quantized materialize span the horizontal scroll exposes (visible window + prefetch). */
function useGuideSpan(controller: GuideController): GuideSpan {
  const { originMs } = controller;
  const scrollX = controller.engine.scrollX;
  return useMemo(() => materializeSpan(originMs, scrollX, TIME_VIEWPORT_DP), [originMs, scrollX]);
}

/** Keeps the controller's group list valid and hands it every rows emission. */
function useRowsSync(
  controller: GuideController,
  channels: readonly ChannelRow[],
  custom: readonly CustomGroup[],
  rows: GuideRow[],
  programs: ProgramRow[] | undefined,
): void {
  useEffect(() => controller.setCustomGroups(custom), [controller, custom]);
  useEffect(() => {
    // A restored group the playlist no longer has falls back to All channels.
    if (channels.length > 0 && controller.groupMemory.validate(groupNames(channels, custom)))
      controller.menu.reset();
  }, [controller, channels, custom]);
  useEffect(() => {
    if (programs !== undefined) controller.setRows(rows);
  }, [controller, rows, programs]);
}

/**
 * Feeds the grid (Android `GuideRowsFeed`): the horizontal scroll drives a
 * quantized materialize span, every (channels, group, span) change
 * re-queries exactly that window's programmes, and the rows land in the
 * controller, which re-resolves focus.
 */
export function useGuideRows(
  controller: GuideController,
  channels: readonly ChannelRow[],
  custom: readonly CustomGroup[],
  queryDeps: GuideQueryDeps = defaultGuideDeps,
): GuideRow[] {
  const group = controller.selectedGroup;
  const span = useGuideSpan(controller);
  const groupChannels = useMemo(() => channelsIn(channels, group, custom), [channels, group, custom]);
  const epgIds = useMemo(() => epgIdsOf(groupChannels), [groupChannels]);
  const programs = useProgramsInRange(epgIds, span.fromMs, span.toMs, queryDeps);
  const rows = useMemo(
    () => (programs === undefined ? NO_ROWS : buildRows(groupChannels, group, span, programs)),
    [groupChannels, group, span, programs],
  );
  useRowsSync(controller, channels, custom, rows, programs);
  return rows;
}
