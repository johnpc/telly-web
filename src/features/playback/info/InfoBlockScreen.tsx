import type { JSX } from 'react';
import { LogoTile } from '../ui/LogoTileScreen';
import { ProgressBar } from '../ui/ProgressBarScreen';
import { channelLabel, type PlaybackInfoData } from './playbackInfo';

interface InfoBlockProps {
  data: PlaybackInfoData;
  showBadges: boolean;
  showDescription: boolean;
}

/** Translucent dark pills, grey caps text ("HD" · "25 FPS" · "MONO"). */
function Badges({ badges }: { badges: readonly string[] }): JSX.Element {
  return (
    <span className="ml-[1.25rem] flex gap-[1rem]" data-testid="info-badges">
      {badges.map((badge) => (
        <span
          key={badge}
          className="rounded-[0.375rem] bg-telly-badge-fill px-[0.375rem] text-[1.375rem] font-bold text-telly-badge-text"
        >
          {badge}
        </span>
      ))}
    </span>
  );
}

/** The "02:30 — 03:45 PM  ▬▬  61 min  1  News One  [HD]" line. */
function TimesLine({ data, showBadges }: Omit<InfoBlockProps, 'showDescription'>): JSX.Element {
  return (
    <div className="flex items-center gap-[1.25rem] text-[1.875rem] text-telly-text-muted">
      {data.timeRange !== null && <span data-testid="info-range">{data.timeRange}</span>}
      <ProgressBar
        permille={data.progressPermille}
        fillClass="bg-telly-dash-fill"
        className="h-[0.375rem] w-[5rem]"
      />
      {data.remaining !== null && <span>{data.remaining}</span>}
      <span className="font-bold text-white" data-testid="info-channel">
        {channelLabel(data)}
      </span>
      {showBadges && <Badges badges={data.badges} />}
    </div>
  );
}

/** Logo tile next to the programme lines (title, times/number/badges, optional description, next line). */
export function InfoBlock({ data, showBadges, showDescription }: InfoBlockProps): JSX.Element {
  return (
    <div className="flex items-center px-[5rem]">
      <div className="flex w-[15.5rem] shrink-0 justify-center">
        <LogoTile
          logoUrl={data.logoUrl}
          name={data.name}
          className="h-[9.875rem] w-[9.875rem] border-[0.25rem] border-telly-logo-focus-border text-[1.875rem]"
        />
      </div>
      <div className="ml-[2rem] flex min-w-0 flex-col gap-[0.75rem]">
        <h2 className="truncate text-[2.125rem] font-semibold text-white" data-testid="info-title">
          {data.title ?? 'No information'}
        </h2>
        <TimesLine data={data} showBadges={showBadges} />
        {showDescription && data.description !== null && (
          <p className="truncate text-[1.75rem] text-telly-text-muted">{data.description}</p>
        )}
        {data.nextLine !== null && (
          <p className="truncate text-[1.875rem] text-telly-text-muted" data-testid="info-next">
            {data.nextLine}
          </p>
        )}
      </div>
    </div>
  );
}
