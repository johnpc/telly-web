import { useLiveQuery } from 'dexie-react-hooks';
import type { JSX } from 'react';
import { type ChannelRepository, channelRepository } from '@/core/db/channelRepository';
import { type ChannelRow, displayName } from '@/core/db/types';
import { TellySettings } from '@/core/settings/tellySettings';
import { useSetting } from '@/core/settings/useSetting';
import { TextFieldScreen } from '@/features/groups/TextFieldScreen';
import { ToolPaneScreen } from '@/features/groups/ToolPaneScreen';
import { ToolRowsScreen } from '@/features/groups/ToolRowsScreen';
import type { ChannelOptionsController, ChannelOptionsDialog } from './channelOptionsController';
import { channelOptionRows } from './channelOptionsRows';
import { externalOn, pickerRows } from './channelOptionsValues';

interface ChannelOptionsProps {
  channelId: number;
  /** The host layer's open dialog (the pane renders it instead of its rows). */
  dialog: ChannelOptionsDialog | null;
  options: ChannelOptionsController;
  /** A pane row activation on the FRESH row (the host finishes Block / Hide / names editor). */
  onRow: (channel: ChannelRow, rowId: string) => void;
  /** BACK: the host closes an open dialog first, then the pane. */
  onBack: () => void;
  channels?: ChannelRepository;
}

interface PaneProps {
  channel: ChannelRow;
  options: ChannelOptionsController;
  onBack: () => void;
}

const SCOPE = 'channel-options';
const TEST_ID = 'channel-options-pane';

/** The in-pane dialogs: the rename editor and the value pickers swap the sheet's content. */
function OptionsDialog({
  dialog,
  channel,
  options,
  onBack,
}: PaneProps & { dialog: ChannelOptionsDialog }): JSX.Element {
  if (dialog.kind === 'Rename') {
    return (
      <ToolPaneScreen scopeId={SCOPE} title="Channel name" testId={TEST_ID} onBack={onBack}>
        <div className="p-[1.5em]">
          <TextFieldScreen
            focusId="channel-options-rename"
            initial={dialog.initial}
            onCommit={options.submitRename.bind(options)}
          />
        </div>
      </ToolPaneScreen>
    );
  }
  return (
    <ToolPaneScreen scopeId={SCOPE} title={dialog.picker} testId={TEST_ID} onBack={onBack}>
      <ToolRowsScreen
        rows={pickerRows(dialog.picker, channel)}
        focusPrefix="channel-options-pick-"
        onActivate={options.choose.bind(options)}
      />
    </ToolPaneScreen>
  );
}

/** The pane's rows (captures 41-42), live off the fresh row. */
function OptionsRows({
  channel,
  onRow,
  onBack,
}: PaneProps & Pick<ChannelOptionsProps, 'onRow'>): JSX.Element {
  const [external] = useSetting(TellySettings.USE_EXTERNAL_PLAYER);
  return (
    <ToolPaneScreen scopeId={SCOPE} title={displayName(channel)} testId={TEST_ID} onBack={onBack}>
      <ToolRowsScreen
        rows={channelOptionRows(channel, externalOn(external))}
        focusPrefix="channel-options-"
        onActivate={(rowId) => onRow(channel, rowId)}
      />
    </ToolPaneScreen>
  );
}

/** Dialog when one is open, else the rows. */
function OptionsPane({
  dialog,
  ...props
}: PaneProps & Pick<ChannelOptionsProps, 'onRow' | 'dialog'>): JSX.Element {
  return dialog === null ? <OptionsRows {...props} /> : <OptionsDialog dialog={dialog} {...props} />;
}

/**
 * The §41 "Channel options" pane shared by the guide and the panel: a
 * settings-shell sheet titled with the channel's display name (a rename
 * updates the title in place); a dialog, when one is open, replaces the rows.
 */
export function ChannelOptionsScreen({
  channelId,
  dialog,
  options,
  onRow,
  onBack,
  channels = channelRepository,
}: ChannelOptionsProps): JSX.Element | null {
  const channel = useLiveQuery(() => channels.byId(channelId), [channels, channelId]);
  if (!channel) return null;
  return <OptionsPane channel={channel} dialog={dialog} options={options} onRow={onRow} onBack={onBack} />;
}
