import { useLiveQuery } from 'dexie-react-hooks';
import type { JSX } from 'react';
import { type ChannelRow, displayName } from '@/core/db/types';
import { TextFieldScreen } from '@/features/groups/TextFieldScreen';
import { ToolPaneScreen } from '@/features/groups/ToolPaneScreen';
import { ToolRowsScreen } from '@/features/groups/ToolRowsScreen';
import type { ChannelOptionsController, ChannelOptionsDialog } from './channelOptionsController';
import { channelOptionRows } from './channelOptionsRows';
import { externalDefaultOf, pickerRows } from './channelOptionsValues';
import type { GuideController } from './guideController';

interface ChannelOptionsProps {
  controller: GuideController;
  channelId: number;
}

interface DialogProps {
  dialog: ChannelOptionsDialog;
  channel: ChannelRow;
  options: ChannelOptionsController;
}

interface PaneProps {
  controller: GuideController;
  channel: ChannelRow;
}

const SCOPE = 'guide-channel-options';
const TEST_ID = 'channel-options-pane';

/** The in-pane dialogs: the rename editor and the value pickers swap the sheet's content. */
function OptionsDialog({ dialog, channel, options }: DialogProps): JSX.Element {
  if (dialog.kind === 'Rename') {
    return (
      <ToolPaneScreen scopeId={SCOPE} title="Channel name" testId={TEST_ID}>
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
    <ToolPaneScreen scopeId={SCOPE} title={dialog.picker} testId={TEST_ID}>
      <ToolRowsScreen
        rows={pickerRows(dialog.picker, channel)}
        focusPrefix="channel-options-pick-"
        onActivate={options.choose.bind(options)}
      />
    </ToolPaneScreen>
  );
}

/** The pane's rows (captures 41-42), live off the fresh row. */
function OptionsRows({ controller, channel }: PaneProps): JSX.Element {
  return (
    <ToolPaneScreen scopeId={SCOPE} title={displayName(channel)} testId={TEST_ID}>
      <ToolRowsScreen
        rows={channelOptionRows(channel, externalDefaultOf(controller.deps.settings))}
        focusPrefix="channel-options-"
        onActivate={controller.parts.onChannelOption}
      />
    </ToolPaneScreen>
  );
}

/** Dialog when one is open, else the rows. */
function OptionsPane({ controller, channel }: PaneProps): JSX.Element {
  const { options } = controller.parts;
  if (options.dialog !== null)
    return <OptionsDialog dialog={options.dialog} channel={channel} options={options} />;
  return <OptionsRows controller={controller} channel={channel} />;
}

/**
 * The §41 "Channel options" pane: a settings-shell sheet titled with the
 * channel's display name (a rename updates the title in place); BACK closes
 * an open dialog first.
 */
export function ChannelOptionsScreen({ controller, channelId }: ChannelOptionsProps): JSX.Element | null {
  const { channels } = controller.deps;
  const channel = useLiveQuery(() => channels.byId(channelId), [channels, channelId]);
  return channel ? <OptionsPane controller={controller} channel={channel} /> : null;
}
