import type { JSX, ReactNode } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { LogoTile } from '../ui/LogoTileScreen';
import { Icon, type IconName } from '../ui/IconsScreen';
import type { RecentCard } from './recentCards';

export interface CardActions {
  onGuide: () => void;
  onHistory: () => void;
  onMultiview: () => void;
  onRecent: (card: RecentCard) => void;
  onClear: () => void;
}

function Card({
  focusId,
  onClick,
  testId,
  children,
}: {
  focusId: string;
  onClick: () => void;
  testId?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <Focusable
      focusId={focusId}
      as="button"
      data-testid={testId}
      onClick={onClick}
      className="flex h-[13.75rem] w-[18.75rem] shrink-0 flex-col items-center justify-center gap-[1.25rem] rounded bg-telly-overlay-card text-white"
      focusedClassName="bg-telly-overlay-card-focused"
    >
      {children}
    </Focusable>
  );
}

function IconCard({
  id,
  icon,
  label,
  onClick,
}: {
  id: string;
  icon: IconName;
  label: string;
  onClick: () => void;
}): JSX.Element {
  return (
    <Card focusId={id} onClick={onClick} testId={`card-${id}`}>
      <Icon name={icon} className="h-[3.5rem] w-[3.5rem]" />
      <span className="text-[1.875rem]">{label}</span>
    </Card>
  );
}

/** The shortcut row: TV guide · History · Multiview · one card per recently watched channel · Clear. */
export function CardsRow({
  recents,
  actions,
}: {
  recents: readonly RecentCard[];
  actions: CardActions;
}): JSX.Element {
  return (
    <div
      className="flex gap-[0.125rem] overflow-x-hidden pl-[3.375rem] portrait:pl-[1rem]"
      data-testid="cards-row"
    >
      <IconCard id="tv-guide" icon="list" label="TV guide" onClick={actions.onGuide} />
      <IconCard id="history" icon="history" label="History" onClick={actions.onHistory} />
      <IconCard id="multiview" icon="multiview" label="Multiview" onClick={actions.onMultiview} />
      {recents.map((card) => (
        <Card
          key={card.channel.id}
          focusId={`recent-${card.channel.id}`}
          testId="recent-card"
          onClick={() => actions.onRecent(card)}
        >
          <LogoTile
            logoUrl={card.channel.logoUrl}
            name={card.name}
            className="h-[6.125rem] w-[12.5rem] text-[1.5rem]"
          />
          <span className="max-w-[16rem] truncate text-[1.625rem] text-telly-playback-accent">
            {card.nowTitle ?? ''}
          </span>
        </Card>
      ))}
      {recents.length > 0 && <IconCard id="clear" icon="trash" label="Clear" onClick={actions.onClear} />}
    </div>
  );
}
