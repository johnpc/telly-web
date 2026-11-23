import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { LogoTile } from '@/features/playback/ui/LogoTileScreen';
import { ProgressBar } from '@/features/playback/ui/ProgressBarScreen';
import { cardFocusId, type VodCard } from './vodBrowse';

interface CardProps {
  card: VodCard;
  onClick: () => void;
}

/**
 * One Movies-browser card (Android `VodScreenCard`): tvg-logo art over the
 * title, plus a thin progress line while a resume position is stored
 * ("Continue watching"). 156 dp wide, 84 dp art, 13 sp title.
 */
export function VodScreenCard({ card, onClick }: CardProps): JSX.Element {
  return (
    <Focusable
      as="li"
      focusId={cardFocusId(card.item.itemKey)}
      data-testid="vod-card"
      onClick={onClick}
      className="flex w-[19.5rem] shrink-0 flex-col rounded-[0.5rem] p-[0.75rem] transition-transform duration-150"
      focusedClassName="scale-105 bg-telly-focus-fill"
    >
      {(focused) => (
        <>
          <LogoTile
            logoUrl={card.item.logoUrl}
            name={card.item.name}
            className="h-[10.5rem] w-[18rem] text-[1.5rem]"
          />
          <span
            className={`mt-[0.75rem] block truncate text-[1.625rem] ${focused ? 'text-telly-focus-text' : 'text-telly-text'}`}
            data-testid="vod-card-name"
          >
            {card.item.name}
          </span>
          {card.progressPermille !== null && (
            <div className="mt-[0.625rem] w-full" data-testid="vod-card-progress">
              <ProgressBar permille={card.progressPermille} className="h-[0.25rem] w-full" />
            </div>
          )}
        </>
      )}
    </Focusable>
  );
}
