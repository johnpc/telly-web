import type { CSSProperties } from 'react';

/**
 * Wizard geometry from the 1920x1080 reference captures (2 px = 1 dp), as
 * Tailwind classes over one CSS unit: `--dp` = 1 dp, scaling with the
 * viewport (2 px at 1080p, 1.33 px at 720p, and never wider than the 960 dp
 * reference canvas on narrow screens). Shared strings keep the panes aligned.
 */
export const DP_STYLE = { '--dp': 'min(100vh / 540, 100vw / 960)' } as unknown as CSSProperties;

/** Leanback guided-action labels render in Roboto Condensed. */
export const CONDENSED_FONT: CSSProperties = {
  fontFamily: "'Roboto Condensed', 'Arial Narrow', 'Roboto', system-ui, sans-serif",
};

export const WIZARD_DIMS = {
  guidancePane: 'w-[calc(470*var(--dp))] shrink-0 pl-[calc(56*var(--dp))] pt-[calc(152*var(--dp))]',
  pane: 'flex h-full flex-col gap-[calc(8*var(--dp))] pl-[calc(20*var(--dp))] pt-[calc(189*var(--dp))]',
  buttonPane: 'w-[calc(152*var(--dp))] shrink-0',
  actionWidth: 'w-[calc(298*var(--dp))]',
  buttonWidth: 'w-[calc(112*var(--dp))]',
  actionRow:
    'flex min-h-[calc(44*var(--dp))] items-center rounded-[calc(4*var(--dp))] px-[calc(14*var(--dp))] pt-[calc(14*var(--dp))] pb-[calc(11*var(--dp))] text-left',
  title: 'text-[calc(14*var(--dp))] leading-[calc(19*var(--dp))]',
  secondary:
    'mt-[calc(4.5*var(--dp))] mb-[calc(2.5*var(--dp))] text-[calc(12*var(--dp))] leading-[calc(16*var(--dp))]',
  focusPill: 'bg-telly-focus-fill text-telly-focus-text!',
} as const;
