import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { type ChannelRow, displayName } from '@/core/db/types';
import { airingRowId, masterCardId } from './searchIds';
import type { SearchProgramHit } from './searchResults';
import { LogoTile, TimesLine } from './SearchWidgetsScreen';

/** One master-lane card: logo tile over the channel name; the selected card keeps a grey outline while unfocused. */
export function MasterCardScreen({
  channel,
  selected,
  onClick,
}: {
  channel: ChannelRow;
  selected: boolean;
  onClick(): void;
}): JSX.Element {
  return (
    <Focusable
      as="li"
      focusId={masterCardId(channel.id)}
      onClick={onClick}
      data-testid="master-card"
      data-selected={selected ? 'true' : undefined}
      className={`flex h-[12.875rem] flex-col items-center justify-center gap-[0.5rem] rounded-[0.5rem] py-[2rem] opacity-[0.42] ${
        selected ? 'ring-1 ring-[#37393C] ring-inset' : ''
      }`}
      focusedClassName="!bg-telly-focus-fill !text-telly-focus-text !opacity-100 !ring-0"
    >
      <LogoTile
        logoUrl={channel.logoUrl}
        name={displayName(channel)}
        className="h-[6rem] w-[9rem] text-[2rem]"
      />
      <span data-testid="card-name" className="max-w-full truncate text-[1.75rem]">
        {displayName(channel)}
      </span>
    </Focusable>
  );
}

/** One airing row; DOWN stops dead at the last one instead of leaking into the master lane. */
export function AiringRowScreen({
  hit,
  last,
  onClick,
}: {
  hit: SearchProgramHit;
  last: boolean;
  onClick(): void;
}): JSX.Element {
  const id = airingRowId(hit.channel.id, hit.program.startMs);
  return (
    <Focusable
      as="li"
      focusId={id}
      onClick={onClick}
      data-testid="airing-row"
      data-focus-down={last ? id : undefined}
      className="flex h-[7.5rem] flex-col justify-center rounded-[0.5rem] px-[1rem] opacity-[0.42]"
      focusedClassName="!bg-telly-focus-fill !text-telly-focus-text !opacity-100"
    >
      <span
        data-testid="airing-title"
        className={`truncate text-[2rem] ${hit.remaining !== null ? 'text-telly-clock-blue' : ''}`}
      >
        {hit.title}
      </span>
      <TimesLine range={hit.timeText} permille={hit.progressPermille} remaining={hit.remaining} />
    </Focusable>
  );
}
