import type { JSX } from 'react';

/** The wizard's glyphs, traced from the Android vector drawables (24 dp grid). */
export type WizardIconKind = 'playlistAdd' | 'link' | 'download' | 'next' | 'radioOn' | 'radioOff';

const PATHS: Readonly<Record<WizardIconKind, string>> = {
  playlistAdd:
    'M14,10L2,10v2h12v-2zM14,6L2,6v2h12L14,6zM18,14v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2,16h8v-2L2,14v2z',
  link: 'M3.9,12c0,-1.71 1.39,-3.1 3.1,-3.1h4L11,7L7,7c-2.76,0 -5,2.24 -5,5s2.24,5 5,5h4v-1.9L7,15.1c-1.71,0 -3.1,-1.39 -3.1,-3.1zM8,13h8v-2L8,11v2zM17,7h-4v1.9h4c1.71,0 3.1,1.39 3.1,3.1s-1.39,3.1 -3.1,3.1h-4L13,17h4c2.76,0 5,-2.24 5,-5s-2.24,-5 -5,-5z',
  download: 'M19,9h-4V3H9v6H5l7,7 7,-7zM5,18v3h14v-3H5z',
  next: 'M8,5v14l11,-7z',
  radioOn:
    'M12,7c-2.76,0 -5,2.24 -5,5s2.24,5 5,5 5,-2.24 5,-5 -2.24,-5 -5,-5zM12,2C6.48,2 2,6.48 2,12s4.48,10 10,10 10,-4.48 10,-10S17.52,2 12,2zM12,20c-4.42,0 -8,-3.58 -8,-8s3.58,-8 8,-8 8,3.58 8,8 -3.58,8 -8,8z',
  radioOff:
    'M12,2C6.48,2 2,6.48 2,12s4.48,10 10,10 10,-4.48 10,-10S17.52,2 12,2zM12,20c-4.42,0 -8,-3.58 -8,-8s3.58,-8 8,-8 8,3.58 8,8 -3.58,8 -8,8z',
};

export function WizardIconScreen({
  kind,
  className,
}: {
  kind: WizardIconKind;
  className: string;
}): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} shrink-0 fill-current`}
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[kind]} />
    </svg>
  );
}
