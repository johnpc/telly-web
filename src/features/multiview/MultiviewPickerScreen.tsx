import type { JSX } from 'react';
import type { ChannelRow } from '@/core/db/types';
import { FocusScope } from '@/core/focus/FocusScope';
import { ChannelPanelScreenRow } from '@/features/panel/ChannelPanelScreenRow';
import { ProgressBar } from '@/features/panel/ChannelPanelScreenWidgets';
import { rowIdOf } from '@/features/panel/panelKeys';
import type { PanelRow } from '@/features/panel/panelRows';
import type { MultiviewScheduleRow } from './multiviewSchedule';
import { useMultiviewPicker } from './useMultiviewPicker';

interface PickerProps {
  channels: readonly ChannelRow[];
  /** The focused pane's channel: carries the play arrow and takes focus on open. */
  currentChannelId: number | null;
  onPick: (channel: ChannelRow) => void;
  onBack: () => void;
}

/** Read-only time + programme rows of the focused channel. */
function Schedule({ rows }: { rows: readonly MultiviewScheduleRow[] }): JSX.Element {
  return (
    <ul data-testid="multiview-schedule" className="min-w-0 flex-1 overflow-hidden pt-[2rem] pl-[1.75rem]">
      {rows.map((row) => (
        <li key={row.key} className="flex h-[4.625rem] items-center gap-[1.5rem] text-[1.875rem]">
          <span className="shrink-0 text-telly-text-muted">{row.timeText}</span>
          <span className={`truncate ${row.airing ? 'text-telly-clock-blue' : 'text-white/90'}`}>
            {row.title}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The focused channel's airing programme, top-right. */
function Detail({ row }: { row: PanelRow | null }): JSX.Element {
  return (
    <div
      data-testid="multiview-detail"
      className="flex w-[34.2%] shrink-0 flex-col gap-[1rem] pt-[4.5rem] pr-[4%]"
    >
      {row !== null && (
        <>
          <span className="truncate text-[2.5rem] font-semibold text-white">
            {row.nowTitle ?? 'No information'}
          </span>
          <div className="flex items-center gap-[1.25rem] text-[1.875rem] text-telly-text-muted">
            {row.nowRange !== null && <span className="whitespace-nowrap">{row.nowRange}</span>}
            <ProgressBar
              permille={row.progressPermille}
              widthClass="w-20"
              heightClass="h-1.5"
              fillClass="bg-telly-dash-fill"
            />
            {row.remaining !== null && <span className="whitespace-nowrap">{row.remaining}</span>}
          </div>
          {row.description !== null && (
            <p className="line-clamp-4 text-[1.75rem] text-telly-text-muted">{row.description}</p>
          )}
        </>
      )}
    </div>
  );
}

/**
 * The channel picker over the dimmed panes: channel list left (the shared
 * panel rows; the pane's channel keeps the play arrow), the focused channel's
 * schedule in the middle, its airing programme's detail top-right. OK on a
 * row commits the pick; BACK returns to the panes.
 */
export function MultiviewScreenPicker({
  channels,
  currentChannelId,
  onPick,
  onBack,
}: PickerProps): JSX.Element {
  const model = useMultiviewPicker(channels, currentChannelId);
  return (
    <FocusScope id="multiview-picker" trap autoFocus={false} onBack={onBack}>
      <div
        data-testid="multiview-picker"
        className="absolute inset-0 flex bg-black/60 font-sans text-telly-text"
      >
        <div
          data-testid="multiview-picker-list"
          className="flex w-[31.25%] shrink-0 flex-col overflow-hidden pt-[0.5rem] pl-[0.5rem]"
        >
          <span className="pb-[0.5rem] pl-[1rem] text-[2rem] text-white">All channels</span>
          <ul className="flex-1 overflow-y-auto" role="listbox" aria-label="Channels">
            {model.rows.map((row) => (
              <li key={row.channel.id}>
                <ChannelPanelScreenRow
                  row={row}
                  playing={row.channel.id === currentChannelId}
                  logo={model.logo}
                  leftTarget={rowIdOf(row.channel.id)}
                  onFocus={() => undefined}
                  onClick={() => onPick(row.channel)}
                />
              </li>
            ))}
          </ul>
        </div>
        <Schedule rows={model.schedule} />
        <Detail row={model.focusedRow} />
      </div>
    </FocusScope>
  );
}
