import type { JSX, ReactNode } from 'react';
import type { PanelStyle } from './usePlayerSettings';

interface TopScrimProps {
  group: string | null;
  clockText: string;
  style: PanelStyle;
}

/** Top scrim: group left, date + clock right, fading out ~90 dp down. */
export function TopScrim({ group, clockText, style }: TopScrimProps): JSX.Element {
  return (
    <div
      className="absolute inset-x-0 top-0 flex h-[11.25rem] items-start justify-between px-[2rem] pt-[1.25rem] text-[2rem] text-white"
      style={{ background: `linear-gradient(rgba(0,0,0,${0.65 * style.alphaFactor}), transparent)` }}
    >
      <span>{group ?? ''}</span>
      {style.showClock && <span data-testid="overlay-clock">{clockText}</span>}
    </div>
  );
}

interface ScaffoldProps extends TopScrimProps {
  testId: string;
  children: ReactNode;
}

/** Top scrim + bottom-scrim column every playback overlay variant sits in. */
export function OverlayScaffold({ group, clockText, style, testId, children }: ScaffoldProps): JSX.Element {
  return (
    <div className="absolute inset-0" data-testid={testId}>
      <TopScrim group={group} clockText={clockText} style={style} />
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col pt-[8rem]"
        style={{ background: `linear-gradient(transparent, rgba(0,0,0,${0.8 * style.alphaFactor}))` }}
      >
        {children}
      </div>
    </div>
  );
}
