import type { JSX } from 'react';
import { type PlayerEngine, VideoSurface } from '@/core/player';
import { sp } from './guideCss';
import { COMPACT_TOP_STRIP_DP, dp } from './guideGeometry';
import type { GuideInfoData } from './guideInfoBuilder';

interface TopProps {
  engine: PlayerEngine;
  info: GuideInfoData | null;
  /** Portrait phone: a 160×90 dp preview in a 108 dp strip. */
  compact?: boolean;
}

/** The dash-progress pill + remaining minutes shown for airing cells only (capture 24). */
function RemainingPill({ info }: { info: GuideInfoData }): JSX.Element | null {
  if (info.remaining === null) return null;
  return (
    <>
      <span
        className="relative overflow-hidden rounded-full bg-telly-progress-track"
        style={{ width: dp(40), height: dp(3), marginLeft: dp(12) }}
      >
        <span
          className="absolute inset-y-0 left-0 bg-telly-dash-fill"
          style={{ width: `${(info.progressPermille ?? 0) / 10}%` }}
        />
      </span>
      <span style={{ marginLeft: dp(12) }} data-testid="guide-info-remaining">
        {info.remaining}
      </span>
    </>
  );
}

/** Times line: range, the airing pill, and the channel's group right-aligned under the star. */
function InfoTimesLine({ info }: { info: GuideInfoData }): JSX.Element {
  return (
    <div
      className="flex flex-wrap items-center whitespace-nowrap text-telly-text-muted"
      style={{ fontSize: sp(15), marginTop: dp(6) }}
    >
      <span data-testid="guide-info-range">{info.range}</span>
      <RemainingPill info={info} />
      <span className="flex-1" />
      {info.group !== null && (
        <span className="text-telly-text" style={{ fontSize: sp(16) }}>
          {info.group}
        </span>
      )}
    </div>
  );
}

/** Title with the star marker far right, the times line, then the description (5 lines max). */
function GuideInfoPane({ info }: { info: GuideInfoData | null }): JSX.Element {
  if (info === null) return <div className="flex-1" data-testid="guide-info" />;
  return (
    <div
      className="flex min-w-0 flex-1 flex-col text-telly-text"
      style={{ paddingTop: dp(6) }}
      data-testid="guide-info"
    >
      <div className="flex items-center">
        <p
          className="min-w-0 flex-1 truncate font-medium"
          style={{ fontSize: sp(23) }}
          data-testid="guide-info-title"
        >
          {info.title}
        </p>
        <span style={{ fontSize: sp(20), marginLeft: dp(12) }}>{info.favorite ? '★' : '☆'}</span>
      </div>
      <InfoTimesLine info={info} />
      {info.description !== null && (
        <p className="line-clamp-5 text-telly-text-muted" style={{ fontSize: sp(14), marginTop: dp(8) }}>
          {info.description}
        </p>
      )}
    </div>
  );
}

/** Top strip (uidump 24): a 320×180 dp live preview at the left, the focused programme's info pane at the right. */
export function GuideTopScreen({ engine, info, compact = false }: TopProps): JSX.Element {
  const preview = compact ? { width: dp(160), height: dp(90) } : { width: dp(320), height: dp(180) };
  return (
    <div
      className="flex shrink-0"
      style={{
        paddingLeft: dp(16),
        paddingTop: dp(12),
        paddingRight: dp(compact ? 12 : 24),
        height: dp(compact ? COMPACT_TOP_STRIP_DP : 192),
      }}
    >
      <div className="shrink-0 bg-black" style={preview} data-testid="guide-preview">
        <VideoSurface engine={engine} />
      </div>
      <div style={{ width: dp(22) }} />
      <GuideInfoPane info={info} />
    </div>
  );
}
