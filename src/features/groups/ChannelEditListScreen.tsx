import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { type ChannelRow, displayName } from '@/core/db/types';
import { LogoTileScreen } from '@/features/guide/LogoTileScreen';
import { GUIDE_ROOT_STYLE } from '@/features/guide/guideCss';
import { channelEditFocusId } from './channelEdit';
import { dp, sp } from './toolCss';

interface ChannelEditListProps {
  title: string;
  hint: string;
  rows: readonly ChannelRow[];
  showStars: boolean;
  onActivate: (channel: ChannelRow) => void;
}

/**
 * The shared Manage-Favorites / Reorder-channels / names-editor list chrome
 * (Android `MyListScreenScaffold` + `ChannelEditScreenList`): flat app
 * background, 28 sp title top-right, muted hint bottom-left, 39 dp rows.
 */
export function ChannelEditListScreen({
  title,
  hint,
  rows,
  showStars,
  onActivate,
}: ChannelEditListProps): JSX.Element {
  return (
    <div
      className="relative h-full w-full overflow-hidden bg-telly-onboarding-bg text-telly-text"
      style={GUIDE_ROOT_STYLE}
      data-testid="channel-edit-screen"
    >
      <h1
        className="absolute right-0 top-0"
        style={{ marginTop: dp(20), marginRight: dp(24), fontSize: sp(28) }}
      >
        {title}
      </h1>
      <p
        className="absolute bottom-0 left-0 text-telly-text-muted"
        style={{ marginLeft: dp(40), marginBottom: dp(16), fontSize: sp(13) }}
      >
        {hint}
      </p>
      <ul
        className="absolute inset-x-0 flex flex-col overflow-y-auto"
        style={{ top: dp(80), bottom: dp(44), paddingLeft: dp(40), paddingRight: dp(40) }}
      >
        {rows.map((channel) => (
          <ChannelEditRow key={channel.id} channel={channel} showStars={showStars} onActivate={onActivate} />
        ))}
      </ul>
    </div>
  );
}

interface ChannelEditRowProps {
  channel: ChannelRow;
  showStars: boolean;
  onActivate: (channel: ChannelRow) => void;
}

function ChannelEditRow({ channel, showStars, onActivate }: ChannelEditRowProps): JSX.Element {
  const name = displayName(channel);
  return (
    <Focusable
      as="li"
      focusId={channelEditFocusId(channel.id)}
      className="flex shrink-0 items-center rounded-[4px]"
      style={{ height: dp(39), paddingLeft: dp(8), paddingRight: dp(8), fontSize: sp(15) }}
      focusedClassName="bg-telly-focus-fill text-telly-focus-text"
      data-testid="channel-edit-row"
      data-channel-id={channel.id}
      data-channel-name={name}
      data-favorite={channel.favorite ? 'true' : undefined}
      onClick={() => onActivate(channel)}
    >
      <LogoTileScreen logoUrl={channel.logoUrl} name={name} widthDp={24} heightDp={24} />
      <span className="min-w-0 flex-1 truncate" style={{ marginLeft: dp(12) }}>
        {name}
      </span>
      {showStars && <FavoriteStar favorite={channel.favorite} />}
    </Focusable>
  );
}

function FavoriteStar({ favorite }: { favorite: boolean }): JSX.Element {
  return (
    <span
      className={favorite ? 'text-telly-playback-accent' : 'text-telly-text-muted'}
      style={{ fontSize: sp(18) }}
      aria-label={favorite ? 'Favorite' : undefined}
    >
      {favorite ? '★' : '☆'}
    </span>
  );
}
