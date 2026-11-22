import type { JSX } from 'react';
import { InfoBlock } from '../info/InfoBlockScreen';
import { OverlayScaffold } from '../info/OverlayScaffoldScreen';
import type { PlaybackInfoData } from '../info/playbackInfo';
import type { PanelStyle } from '../info/usePlayerSettings';

/** Compact zap overlay (round3-ref 10): logo, title, times line, description and next programme — no progress bar, cards or chevron. */
export function ZapOverlay({ data, style }: { data: PlaybackInfoData; style: PanelStyle }): JSX.Element {
  return (
    <OverlayScaffold group={data.group} clockText={data.clockText} style={style} testId="zap-overlay">
      <div className="pb-[3rem]">
        <InfoBlock data={data} showBadges={false} showDescription />
      </div>
    </OverlayScaffold>
  );
}

/** The channel-number entry pill (ux-spec §3.3): typed digits top-right until the entry commits. */
export function NumberEntryPill({ digits }: { digits: string }): JSX.Element {
  return (
    <div
      className="absolute top-[3rem] right-[3rem] rounded-[0.75rem] bg-telly-badge-fill px-[2rem] py-[0.75rem] text-[3rem] text-white"
      data-testid="number-entry"
    >
      {digits}
    </div>
  );
}

/** Transient "Reconnecting…" pill over the frozen last frame while the engine re-prepares a dropped stream. */
export function ReconnectingPill(): JSX.Element {
  return (
    <div
      className="absolute top-[3rem] left-[3rem] rounded-[0.75rem] bg-telly-badge-fill px-[1.75rem] py-[1rem] text-[1.875rem] text-white"
      data-testid="reconnecting"
    >
      Reconnecting…
    </div>
  );
}
