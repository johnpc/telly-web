import type { JSX } from 'react';

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter((word) => word !== '')
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

interface LogoTileProps {
  logoUrl: string | null;
  name: string;
  /** Tailwind size classes (height/width). */
  className: string;
}

/** Channel-logo tile with an initials fallback under the image (Android `TellyScreenLogoTile`). */
export function LogoTile({ logoUrl, name, className }: LogoTileProps): JSX.Element {
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded bg-telly-logo-tile ${className}`}
    >
      <span className="text-[1.6em] text-white">{initialsOf(name)}</span>
      {logoUrl !== null && (
        <img src={logoUrl} alt={`${name} logo`} className="absolute inset-0 h-full w-full object-contain" />
      )}
    </div>
  );
}
