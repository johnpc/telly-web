import type { JSX } from 'react';
import { ChannelPanelScreenDetail } from './ChannelPanelScreenDetail';
import { ChannelPanelScreenGroups } from './ChannelPanelScreenGroups';
import { ChannelPanelScreenRow } from './ChannelPanelScreenRow';
import { groupIdOf, rowIdOf } from './panelKeys';
import type { PanelRow } from './panelRows';
import type { PanelModel } from './usePanelModel';

interface ChannelPanelScreenProps {
  model: PanelModel;
  selectedGroup: string;
  /** The row whose detail card is expanded. */
  focusIndex: number;
  playingChannelId: number | null;
  onSelectGroup(group: string): void;
  onRowFocused(index: number): void;
  onTune(row: PanelRow): void;
}

/**
 * Channel-list panel over the dimmed video (captures 25/36/47): groups
 * column left, blue clock + channel rows right; the focused row expands
 * inline into the detail card at its list position. The scrim lets the
 * video show through like TiviMate's.
 */
export function ChannelPanelScreen({
  model,
  selectedGroup,
  focusIndex,
  playingChannelId,
  onSelectGroup,
  onRowFocused,
  onTune,
}: ChannelPanelScreenProps): JSX.Element {
  const remembered = model.rows[focusIndex] ?? model.rows[0];
  return (
    <div
      data-testid="channel-panel"
      data-group={selectedGroup}
      className="fixed inset-0 flex font-sans text-telly-text"
      style={{ backgroundColor: `rgba(19, 22, 25, ${model.scrim})` }}
    >
      <ChannelPanelScreenGroups
        groups={model.groups}
        selected={selectedGroup}
        locked={model.lockedGroups}
        rightTarget={remembered === undefined ? undefined : rowIdOf(remembered.channel.id)}
        onSelect={onSelectGroup}
      />
      <div className="flex min-w-0 flex-1 flex-col pt-4 pr-8">
        <span data-testid="panel-clock" className="pb-4 pl-6 text-[1.75rem] text-telly-clock-blue">
          {model.clockText}
        </span>
        <ul data-testid="panel-rows" className="flex-1 overflow-y-auto" role="listbox" aria-label="Channels">
          {model.rows.map((row, index) => (
            <li key={row.channel.id}>
              <ChannelPanelScreenRow
                row={row}
                playing={row.channel.id === playingChannelId}
                logo={model.logo}
                leftTarget={groupIdOf(selectedGroup)}
                onFocus={() => onRowFocused(index)}
                onClick={() => onTune(row)}
              />
              {index === focusIndex && <ChannelPanelScreenDetail row={row} logo={model.logo} />}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
