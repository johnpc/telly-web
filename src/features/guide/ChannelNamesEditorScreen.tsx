import { useState, type JSX } from 'react';
import { channelRepository } from '@/core/db/channelRepository';
import { type ChannelRow, displayName } from '@/core/db/types';
import { FocusScope } from '@/core/focus/FocusScope';
import { useNavigator } from '@/core/navigation/useNavigator';
import { ChannelEditListScreen } from '@/features/groups/ChannelEditListScreen';
import { TextFieldScreen } from '@/features/groups/TextFieldScreen';
import { ToolPaneScreen } from '@/features/groups/ToolPaneScreen';
import { CHANNEL_NAMES_EDITOR_HINT, CHANNEL_NAMES_EDITOR_TITLE } from '@/features/groups/channelEdit';
import { useChannelEdit } from '@/features/groups/useChannelEdit';

interface RenameState {
  editing: ChannelRow | null;
  open: (channel: ChannelRow) => void;
  close: () => void;
  commit: (text: string) => void;
}

/** Persists the custom name; blank restores the playlist name (the pane's Channel-name row semantics). */
function renameChannel(channel: ChannelRow, text: string): void {
  const name = text.trim();
  void channelRepository.updateOverrides(channel.id, { customName: name === '' ? null : name });
}

/** The dialog's commit: persist the rename (if any) and close. */
function commitWith(editing: ChannelRow | null, close: () => void): (text: string) => void {
  return (text) => {
    if (editing !== null) renameChannel(editing, text);
    close();
  };
}

/** The rename dialog's state: the channel being renamed. */
function useRename(): RenameState {
  const [editing, setEditing] = useState<ChannelRow | null>(null);
  const close = (): void => setEditing(null);
  return { editing, open: setEditing, close, commit: commitWith(editing, close) };
}

/** The rename dialog pane. */
function RenamePane({
  channel,
  onCommit,
}: {
  channel: ChannelRow;
  onCommit: (text: string) => void;
}): JSX.Element {
  return (
    <ToolPaneScreen scopeId="channel-names-rename" title="Channel name" testId="channel-names-rename">
      <div className="p-[1.5em]">
        <TextFieldScreen focusId="channel-names-field" initial={displayName(channel)} onCommit={onCommit} />
      </div>
    </ToolPaneScreen>
  );
}

/**
 * "Channel names editor" (Channel options §41): the channel-edit list idiom
 * with OK opening a rename dialog; BACK closes the dialog first, then pops.
 */
export function ChannelNamesEditorScreen(): JSX.Element {
  const navigator = useNavigator();
  const rename = useRename();
  const edit = useChannelEdit(null);
  const onBack = rename.editing === null ? (): void => void navigator.pop() : rename.close;
  return (
    <FocusScope id="channel-names-editor" onBack={onBack}>
      <ChannelEditListScreen
        title={CHANNEL_NAMES_EDITOR_TITLE}
        hint={CHANNEL_NAMES_EDITOR_HINT}
        rows={edit.rows}
        showStars={false}
        onActivate={rename.open}
      />
      {rename.editing !== null && <RenamePane channel={rename.editing} onCommit={rename.commit} />}
    </FocusScope>
  );
}
