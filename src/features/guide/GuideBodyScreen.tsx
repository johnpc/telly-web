import type { KeyQueue } from '@/core/input/keyQueue';
import { useHoldKeys, useReplayHeldKeys } from '@/core/input/useKeyQueue';
import type { JSX } from 'react';
import type { PlaybackSession } from '@/features/playback/tune';
import type { CustomGroup } from '@/features/groups/customGroups';
import { useCustomGroups } from '@/features/groups/useCustomGroups';
import { GuideGridScreen } from './GuideGridScreen';
import { GuideGroupsScreen } from './GuideGroupsScreen';
import { GuideHeaderScreen } from './GuideHeaderScreen';
import { GuideOverlaysScreen } from './GuideOverlaysScreen';
import { GuideTopScreen } from './GuideTopScreen';
import type { GuideController } from './guideController';
import type { GuideDims } from './guideGeometry';
import { guideBackground } from './guideCss';
import type { GuideRow } from './guideModel';
import type { GuideStyle } from './guideStyle';
import { useGuideController } from './useGuideController';
import { useGuideKeys } from './useGuideKeys';
import { useGuideNow } from './useGuideNow';
import { useGuideRows } from './useGuideRows';
import { useGuideStyle } from './useGuideStyle';

interface FrameProps {
  controller: GuideController;
  session: PlaybackSession;
  rows: GuideRow[];
  custom: readonly CustomGroup[];
  style: GuideStyle;
}

/** Preview/info strip, timeline header and the grid, stacked. */
function GuideMainColumn({ controller, session, rows, style }: Omit<FrameProps, 'custom'>): JSX.Element {
  const { parts } = controller;
  return (
    <div className="relative flex min-w-0 flex-1 flex-col">
      <GuideTopScreen engine={session.engine} info={parts.info()} compact={controller.dims.compact} />
      <GuideHeaderScreen controller={controller} clockStyle={parts.clockStyle()} />
      <GuideGridScreen
        controller={controller}
        rows={rows}
        style={style}
        playingId={session.playing?.channel.id ?? null}
      />
    </div>
  );
}

/** The optional rail + groups column at the left (the Groups layer). */
function GuideLeftPane({
  controller,
  session,
  custom,
}: Omit<FrameProps, 'rows' | 'style'>): JSX.Element | null {
  if (controller.layer.kind !== 'Groups') return null;
  return <GuideGroupsScreen controller={controller} channels={session.channels} custom={custom} />;
}

/** The guide's layout: left pane, main column, overlays on top. */
function GuideFrameScreen(props: FrameProps): JSX.Element {
  const { controller, style } = props;
  return (
    <div
      className="relative flex h-full w-full"
      style={{ background: guideBackground(style.backgroundAlpha) }}
      data-testid="guide-screen"
      data-layer={controller.layer.kind}
      data-group={controller.selectedGroup}
    >
      <GuideLeftPane {...props} />
      <GuideMainColumn {...props} />
      <GuideOverlaysScreen controller={controller} rows={props.rows} rowHeightDp={style.rowHeightDp} />
    </div>
  );
}

/** The guide over a live playback session: controller, rows feed, keys, and the layer stack. */
export function GuideBodyScreen({
  session,
  queue,
  dims,
}: {
  session: PlaybackSession;
  queue: KeyQueue;
  dims: GuideDims;
}): JSX.Element {
  const controller = useGuideController(session, dims);
  const custom = useCustomGroups();
  const rows = useGuideRows(controller, session.channels, custom);
  useGuideNow(controller);
  useGuideKeys(controller);
  useHoldKeys(queue);
  useReplayHeldKeys(queue, controller.loaded);
  const style = useGuideStyle();
  return (
    <GuideFrameScreen controller={controller} session={session} rows={rows} custom={custom} style={style} />
  );
}
