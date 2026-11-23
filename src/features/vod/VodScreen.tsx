import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { useNavigator } from '@/core/navigation/useNavigator';
import { ChannelPanelScreenGroups } from '@/features/panel/ChannelPanelScreenGroups';
import { cardIds, useFocusFirstCard, useVodBrowser, type VodBrowser } from './useVodBrowser';
import { VodScreenCard } from './VodScreenCard';

const NO_LOCKS: ReadonlySet<string> = new Set();

/** Categories column (the panel's groups idiom) + the selected category's card grid. */
function Browser({
  browser,
  onPlay,
}: {
  browser: VodBrowser;
  onPlay: (itemKey: string) => void;
}): JSX.Element {
  const ids = cardIds(browser.cards);
  useFocusFirstCard(ids);
  return (
    <div className="flex h-full w-full pt-[10rem]">
      <ChannelPanelScreenGroups
        groups={browser.categories}
        selected={browser.selected ?? ''}
        locked={NO_LOCKS}
        rightTarget={ids[0]}
        onSelect={browser.select}
      />
      <ul
        className="m-0 grid flex-1 list-none content-start gap-[1.5rem] overflow-y-auto p-0 pr-[5rem] pl-[1rem] pb-[2rem]"
        style={{ gridTemplateColumns: 'repeat(auto-fill, 19.5rem)' }}
        data-testid="vod-grid"
      >
        {browser.cards.map((card) => (
          <VodScreenCard key={card.item.itemKey} card={card} onClick={() => onPlay(card.item.itemKey)} />
        ))}
      </ul>
    </div>
  );
}

/**
 * The Movies browser (ux-spec §VOD, Android `VodScreen`): "Movies" heading
 * top-left, categories column left, logo-art item cards right, BACK popping
 * to the guide. Playlists without VOD entries render the empty state.
 */
export function VodScreen(): JSX.Element {
  const navigator = useNavigator();
  const browser = useVodBrowser();
  return (
    <FocusScope id="vod" autoFocus={false} onBack={() => navigator.pop()}>
      <div className="relative h-full w-full overflow-hidden bg-telly-onboarding-bg" data-testid="vod-screen">
        <h1 className="absolute top-[2.5rem] left-[5rem] text-[3.5rem] text-white">Movies</h1>
        {browser.empty ? (
          <p className="absolute inset-0 flex items-center justify-center text-[2.25rem] text-telly-text-muted">
            No VOD content in your playlists
          </p>
        ) : (
          <Browser browser={browser} onPlay={(itemKey) => navigator.push({ kind: 'VodPlayback', itemKey })} />
        )}
      </div>
    </FocusScope>
  );
}
