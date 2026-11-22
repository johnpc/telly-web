import type { JSX } from 'react';
import { PERMILLE } from './programTimes';

/** Shared search/My-list render primitives: logo tile, progress line, section header, times line. */

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter((word) => word !== '')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

interface LogoTileProps {
  logoUrl: string | null;
  name: string;
  className: string;
}

/** Channel logo over the initials fallback tile (Android `TellyScreenLogoTile`). */
export function LogoTile({ logoUrl, name, className }: LogoTileProps): JSX.Element {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-[0.5rem] bg-telly-logo-tile text-white ${className}`}
    >
      <span className="text-[1.5em] leading-none">{initialsOf(name)}</span>
      {logoUrl !== null && (
        <img src={logoUrl} alt={`${name} logo`} className="absolute inset-0 h-full w-full object-contain" />
      )}
    </div>
  );
}

interface ProgressBarProps {
  permille: number;
  className?: string;
  fillClassName?: string;
}

/** The thin progress line under a card / inside the times line (Android `TellyScreenProgressBar`). */
export function ProgressBar({
  permille,
  className = 'h-[0.25rem]',
  fillClassName = 'bg-telly-playback-accent',
}: ProgressBarProps): JSX.Element {
  return (
    <div data-testid="progress-bar" className={`relative w-full bg-telly-progress-track ${className}`}>
      <div
        className={`absolute inset-y-0 left-0 ${fillClassName}`}
        style={{ width: `${(permille / PERMILLE) * 100}%` }}
      />
    </div>
  );
}

/** The grey-white section header ("Channels" / "Programs" / "Search history"). */
export function SectionHeader({ text, className = '' }: { text: string; className?: string }): JSX.Element {
  return <h2 className={`text-[1.75rem] leading-[2.375rem] text-telly-text/[0.42] ${className}`}>{text}</h2>;
}

interface TimesLineProps {
  range: string;
  permille: number;
  remaining: string | null;
  className?: string;
}

/** "12:45 — 01:45 AM ▬▬ 50 min" while airing, bare times otherwise (Android `TellyScreenTimesLine`). */
export function TimesLine({
  range,
  permille,
  remaining,
  className = 'text-[1.625rem]',
}: TimesLineProps): JSX.Element {
  return (
    <div className={`flex items-center gap-[1.25rem] text-telly-text-muted ${className}`}>
      <span data-testid="airing-time">{range}</span>
      {remaining !== null && (
        <>
          <ProgressBar
            permille={permille}
            className="h-[0.375rem] !w-[5rem]"
            fillClassName="bg-telly-dash-fill"
          />
          <span>{remaining}</span>
        </>
      )}
    </div>
  );
}
