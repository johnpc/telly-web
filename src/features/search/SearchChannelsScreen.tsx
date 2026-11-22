import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { type ChannelRow, displayName } from '@/core/db/types';
import { channelCardId } from './searchIds';
import type { SearchChannelHit } from './searchResults';
import { LogoTile, ProgressBar, SectionHeader } from './SearchWidgetsScreen';

interface SearchChannelsProps {
  hits: readonly SearchChannelHit[];
  onTune(channel: ChannelRow): void;
}

/**
 * The Channels shelf (capture 50): landscape cards with logo tile, channel
 * name, the airing programme in accent blue and a thin progress line. Resting
 * cards sit at 42% opacity; focus restores full opacity in the white pill.
 * OK tunes the channel.
 */
export function SearchChannelsScreen({ hits, onTune }: SearchChannelsProps): JSX.Element {
  return (
    <section data-testid="search-channels">
      <SectionHeader text="Channels" className="pt-[4rem] pl-[3rem]" />
      <ul className="flex gap-[1rem] overflow-x-auto px-[3rem] pt-[1.75rem]">
        {hits.map((hit) => (
          <Focusable
            key={hit.channel.id}
            as="li"
            focusId={channelCardId(hit.channel.id)}
            onClick={() => onTune(hit.channel)}
            data-testid="channel-card"
            className="w-[15.5rem] shrink-0 rounded-[0.5rem] bg-[#1B222B] p-[1rem] text-center opacity-[0.42]"
            focusedClassName="!bg-telly-focus-fill !text-telly-focus-text !opacity-100"
          >
            <LogoTile
              logoUrl={hit.channel.logoUrl}
              name={displayName(hit.channel)}
              className="mx-auto h-[5.25rem] w-[12.5rem] text-[1.75rem]"
            />
            <div data-testid="card-name" className="mt-[0.75rem] truncate text-[1.75rem]">
              {displayName(hit.channel)}
            </div>
            <div data-testid="card-now" className="truncate text-[1.625rem] text-telly-playback-accent">
              {hit.nowTitle ?? ''}
            </div>
            <ProgressBar permille={hit.progressPermille} className="mt-[0.5rem] h-[0.25rem]" />
          </Focusable>
        ))}
      </ul>
    </section>
  );
}
