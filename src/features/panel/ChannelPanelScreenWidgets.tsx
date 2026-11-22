import type { JSX } from 'react';
import { initialsOf } from './panelKeys';
import type { LogoStyle } from './usePanelModel';

interface LogoTileProps {
  logoUrl: string | null;
  name: string;
  /** Tailwind size classes (width + height). */
  sizeClass: string;
  textClass: string;
  style: LogoStyle;
}

/** The channel-logo tile used by every row (Android `TellyScreenLogoTile`). */
export function LogoTile({ logoUrl, name, sizeClass, textClass, style }: LogoTileProps): JSX.Element {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden text-white ${sizeClass} ${textClass} ${style.rounded ? 'rounded-lg' : ''}`}
      style={{ backgroundColor: style.background }}
    >
      {initialsOf(name)}
      {logoUrl !== null && (
        <img src={logoUrl} alt={`${name} logo`} className="absolute inset-0 h-full w-full object-contain" />
      )}
    </span>
  );
}

interface ProgressBarProps {
  permille: number;
  widthClass: string;
  heightClass: string;
  fillClass: string;
}

/** Thin track + fill (Android `TellyScreenProgressBar`). */
export function ProgressBar({ permille, widthClass, heightClass, fillClass }: ProgressBarProps): JSX.Element {
  return (
    <span
      data-testid="progress-bar"
      className={`relative inline-block shrink-0 bg-telly-progress-track ${widthClass} ${heightClass}`}
    >
      <span className={`absolute inset-y-0 left-0 ${fillClass}`} style={{ width: `${permille / 10}%` }} />
    </span>
  );
}
