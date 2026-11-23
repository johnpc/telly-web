import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { useFocusedId } from '@/core/focus/useFocusedId';
import type { TransportCatchup } from '@/features/catchup';
import { Icon } from '../ui/IconsScreen';
import { ProgressBar } from '../ui/ProgressBarScreen';
import { type CardActions, CardsRow } from './CardsRowScreen';
import { InfoBlock } from './InfoBlockScreen';
import { OverlayScaffold } from './OverlayScaffoldScreen';
import type { PlaybackInfoData } from './playbackInfo';
import { recentCardLine, type RecentCard } from './recentCards';
import { TransportRow } from './TransportRowScreen';
import type { PanelStyle } from './usePlayerSettings';

interface InfoOverlayProps {
  data: PlaybackInfoData;
  recents: readonly RecentCard[];
  style: PanelStyle;
  transport: boolean;
  /** Non-null during catch-up: the transport row becomes the seek transport. */
  catchup?: TransportCatchup | null;
  actions: CardActions;
  onFeature: (feature: string) => void;
}

/**
 * Bottom info overlay (capture 34): top scrim with group + clock, channel
 * logo, programme lines, full-width progress bar, optional transport row and
 * the shortcut cards row; a focused recent card swaps the chevron for its
 * air-time + title line.
 */
export function InfoOverlay({
  data,
  recents,
  style,
  transport,
  catchup = null,
  actions,
  onFeature,
}: InfoOverlayProps): JSX.Element {
  const focused = useFocusedId();
  const focusedCard = recents.find((card) => `recent-${card.channel.id}` === focused) ?? null;
  const line = recentCardLine(focusedCard);
  return (
    <FocusScope id="playback-info" trap autoFocus="first">
      <OverlayScaffold group={data.group} clockText={data.clockText} style={style} testId="info-overlay">
        <InfoBlock data={data} showBadges showDescription={false} />
        <div className="mt-[1.25rem] px-[5rem]">
          <ProgressBar permille={data.progressPermille} thumb />
        </div>
        {transport && <TransportRow data={data} onFeature={onFeature} catchup={catchup} />}
        <div className="relative mt-[3.75rem] pb-[3.625rem]">
          <CardsRow recents={recents} actions={actions} />
          {line === null ? (
            <Icon
              name="chevron-down"
              className="absolute bottom-[0.5rem] left-1/2 h-[3.5rem] w-[3.5rem] -translate-x-1/2 text-white/90"
            />
          ) : (
            <p
              className="absolute bottom-[0.25rem] left-[5rem] truncate text-[1.875rem] text-white"
              data-testid="recent-card-line"
            >
              {line}
            </p>
          )}
        </div>
      </OverlayScaffold>
    </FocusScope>
  );
}
