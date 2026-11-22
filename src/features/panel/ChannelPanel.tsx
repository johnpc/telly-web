import { useMemo, type JSX } from 'react';
import type { ChannelRow } from '@/core/db/types';
import { FocusScope } from '@/core/focus/FocusScope';
import { useFocusedId } from '@/core/focus/useFocusedId';
import { useSettingsRepository } from '@/core/settings/settingsContext';
import type { PlaybackSession } from '@/features/playback/tune';
import { ChannelPanelScreen } from './ChannelPanelScreen';
import { PinPrompt } from './PinPrompt';
import { type PanelDeps, panelDeps } from './panelDeps';
import { indexOfChannel, rowIndexOf } from './panelKeys';
import { useFocusCommand } from './useFocusCommand';
import { usePanelKeys, useSelectGroup, useTune } from './usePanelActions';
import { usePanelFocus } from './usePanelFocus';
import { usePanelModel } from './usePanelModel';

export interface ChannelPanelProps {
  session: PlaybackSession;
  /** BACK: the host removes the panel. */
  onClose(): void;
  /** OK on a row, after `session.tuner.tune(channel)`: the host closes the panel and shows the zap overlay. */
  onTuned(channel: ChannelRow): void;
  /** Long-OK on a row: the host opens the channel context menu. */
  onContextMenu(channel: ChannelRow): void;
  deps?: PanelDeps;
}

/**
 * The channel-list panel overlay (Android `ChannelPanelScreen` +
 * `PanelViewModel`): opens focused on the playing channel, LEFT/RIGHT move
 * between the groups and channel columns, UP/DOWN wrap inside the list,
 * OK tunes, long-OK opens the context menu, BACK closes. The panel never
 * auto-hides while the user browses (`PanelTimeouts` has no panel entry).
 */
export function ChannelPanel(props: ChannelPanelProps): JSX.Element {
  const { session, onClose, onTuned, onContextMenu, deps = panelDeps } = props;
  const settings = useSettingsRepository();
  const parental = useMemo(() => deps.parental(settings), [deps, settings]);
  const playingId = session.playing?.channel.id ?? null;
  const focus = usePanelFocus(parental, indexOfChannel(session.channels, playingId));
  const { mode, command } = focus.state;
  const model = usePanelModel(session, mode.group, deps);
  useFocusCommand(command, model.rows);
  usePanelKeys(model.rows, rowIndexOf(useFocusedId(), model.rows), mode.kind === 'Browsing', onContextMenu);
  const tune = useTune(session, onTuned);
  const selectGroup = useSelectGroup(focus, model.lockedGroups);
  return (
    <FocusScope id="channel-panel" trap onBack={onClose}>
      <ChannelPanelScreen
        model={model}
        selectedGroup={mode.group}
        focusIndex={mode.row}
        playingChannelId={playingId}
        onSelectGroup={selectGroup}
        onRowFocused={focus.rowFocused}
        onTune={tune}
      />
      {mode.kind === 'PinPrompt' && (
        <PinPrompt
          keyboard={parental.usesKeyboardPin}
          onSubmit={focus.submitPin}
          onDismiss={focus.dismissPin}
        />
      )}
    </FocusScope>
  );
}
