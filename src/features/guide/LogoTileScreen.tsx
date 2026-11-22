import { useState, type JSX } from 'react';
import { dp } from './guideGeometry';

interface LogoTileProps {
  logoUrl: string | null;
  name: string;
  widthDp: number;
  heightDp: number;
}

/** Two-letter monogram when a channel has no (loadable) logo (Android `TellyScreenLogoTile`). */
function monogram(name: string): string {
  const words = name.split(/\s+/).filter((w) => w !== '');
  const letters = words.length >= 2 ? `${words[0]?.[0] ?? ''}${words[1]?.[0] ?? ''}` : name.slice(0, 2);
  return letters.toUpperCase();
}

/** The rounded dark logo tile; the image sits over the monogram and hides when it fails. */
export function LogoTileScreen({ logoUrl, name, widthDp, heightDp }: LogoTileProps): JSX.Element {
  const [failed, setFailed] = useState(false);
  const showImage = logoUrl !== null && !failed;
  return (
    <span
      role={showImage ? undefined : 'img'}
      aria-label={showImage ? undefined : `${name} logo`}
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-[3px] border border-telly-logo-focus-border bg-telly-logo-tile text-telly-text"
      style={{ width: dp(widthDp), height: dp(heightDp), fontSize: dp(heightDp * 0.5) }}
    >
      {!showImage && monogram(name)}
      {logoUrl !== null && (
        <img
          src={logoUrl}
          alt={`${name} logo`}
          className={showImage ? 'absolute inset-0 h-full w-full object-contain' : 'hidden'}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
