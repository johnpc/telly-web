import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { focusEngine } from '@/core/focus/focusEngine';
import { useKeyHandler } from '@/core/input/useKeyHandler';
import { useNavigator } from '@/core/navigation/useNavigator';
import { ChannelEditListScreen } from './ChannelEditListScreen';
import {
  CHANNEL_EDIT_MOVE_HINT,
  CHANNEL_EDIT_PREFIX,
  MANAGE_FAVORITES_TITLE,
  REORDER_CHANNELS_TITLE,
} from './channelEdit';
import { useChannelEdit } from './useChannelEdit';

interface ChannelEditHostProps {
  title: string;
  group: string | null;
  showStars: boolean;
}

/** The focused row's channel id, read off the focus engine's id scheme. */
function focusedChannelId(): number | null {
  const id = focusEngine.current;
  return id?.startsWith(CHANNEL_EDIT_PREFIX) === true ? Number(id.slice(CHANNEL_EDIT_PREFIX.length)) : null;
}

function ChannelEditHost({ title, group, showStars }: ChannelEditHostProps): JSX.Element {
  const navigator = useNavigator();
  const edit = useChannelEdit(group);
  useKeyHandler((key) => {
    if (key !== 'LEFT' && key !== 'RIGHT') return false;
    const channelId = focusedChannelId();
    if (channelId !== null) edit.move(channelId, key === 'LEFT' ? -1 : 1);
    return true;
  });
  return (
    <FocusScope id={`channel-edit-${group ?? 'favorites'}`} autoFocus="first" onBack={() => navigator.pop()}>
      <ChannelEditListScreen
        title={title}
        hint={CHANNEL_EDIT_MOVE_HINT}
        rows={edit.rows}
        showStars={showStars}
        onActivate={edit.toggle}
      />
    </FocusScope>
  );
}

/** "Manage Favorites": every channel with its favorite state, favorites first; OK toggles, LEFT/RIGHT moves. */
export function ManageFavoritesScreen(): JSX.Element {
  return <ChannelEditHost title={MANAGE_FAVORITES_TITLE} group={null} showStars />;
}

/** "Reorder channels": the sheet's group in its live order; LEFT/RIGHT moves the focused channel. */
export function ReorderChannelsScreen({ group }: { group: string }): JSX.Element {
  return <ChannelEditHost title={REORDER_CHANNELS_TITLE} group={group} showStars={false} />;
}
