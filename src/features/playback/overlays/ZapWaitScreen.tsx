import type { JSX } from 'react';
import { LogoTile } from '../ui/LogoTileScreen';
import { ProgressBar } from '../ui/ProgressBarScreen';
import type { ZapWaitCard, ZapWaitView } from './zapWait';

/** First tune (no previous picture to hold): a dark card with the channel logo + name, centred over black. */
function ChannelCard({ card }: { card: ZapWaitCard }): JSX.Element {
  return (
    <div className="absolute inset-0 flex items-center justify-center" data-testid="zap-wait-card">
      <div className="flex flex-col items-center rounded-[1rem] bg-telly-overlay-card px-[4rem] py-[3rem]">
        <LogoTile logoUrl={card.logoUrl} name={card.name} className="h-[12rem] w-[20rem] text-[3rem]" />
        <p className="mt-[2rem] max-w-[40rem] truncate text-[2.25rem] text-telly-text">{card.name}</p>
      </div>
    </div>
  );
}

/**
 * The zap wait, under every overlay and above the video: the previous frame
 * (held by the engine's canvas) or the channel card, plus the runway bar and
 * its label at the top centre — the one band no overlay uses (the zap / info
 * overlays own the bottom, their group + clock the top corners, the
 * reconnecting and number-entry pills the top corners too). Informational
 * only — nothing here takes focus.
 */
export function ZapWait({ view }: { view: ZapWaitView }): JSX.Element | null {
  if (view.kind === 'Hidden') return null;
  return (
    <div className="pointer-events-none absolute inset-0" data-testid="zap-wait" aria-live="polite">
      {view.card !== null && <ChannelCard card={view.card} />}
      <div
        className="absolute inset-x-0 top-[6rem] flex flex-col items-center gap-[1rem]"
        data-testid="runway-progress"
      >
        <ProgressBar permille={view.permille} className="h-[0.375rem] w-[40rem] max-w-[60vw]" />
        <span
          className="rounded-[0.75rem] bg-telly-badge-fill px-[1.5rem] py-[0.5rem] text-[1.75rem] text-white"
          data-testid="runway-label"
        >
          {view.label}
        </span>
      </div>
    </div>
  );
}
