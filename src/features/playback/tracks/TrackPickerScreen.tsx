import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { MenuRow } from '../ui/MenuRowScreen';
import { TrackLabels } from './trackLabels';
import { PICKER_TITLES, type TrackPickerKind } from './trackPickerKind';
import type { TrackPickerRow, TrackSource } from './trackPickerRows';

interface TrackPickerProps {
  kind: TrackPickerKind;
  rows: readonly TrackPickerRow[];
  source: TrackSource;
  /** Web honesty: the browser can only DELAY audio, never advance it. */
  delayOnly: boolean;
  onRow: (rowId: string) => void;
  onBack: () => void;
}

/**
 * Compact centered picker dialog over playback (ux-spec §3.14): title, then
 * one focusable row per option with the active one radio-checked. The sync
 * picker is a stepper — its title carries the live offset and stays open.
 */
export function TrackPicker({ kind, rows, source, delayOnly, onRow, onBack }: TrackPickerProps): JSX.Element {
  const title =
    kind === 'Sync'
      ? `${PICKER_TITLES[kind]} · ${TrackLabels.sync(source.audioSyncMs)}`
      : PICKER_TITLES[kind];
  return (
    <FocusScope id="playback-track-picker" trap autoFocus="first" onBack={onBack}>
      <div className="absolute inset-0 flex items-center justify-center" data-testid="track-picker">
        <div className="w-[40rem] rounded-[1rem] bg-[#161b21f2] px-[1rem] py-[1.75rem]">
          <h2 className="px-[2rem] pb-[1.25rem] text-[2rem] text-white">{title}</h2>
          {kind === 'Sync' && delayOnly && (
            <p className="px-[2rem] pb-[1rem] text-[1.5rem] text-telly-text-muted">
              Web: audio can be delayed, not advanced
            </p>
          )}
          {rows.map((row) => (
            <MenuRow
              key={row.id}
              focusId={`picker-${row.id}`}
              label={row.label}
              checked={kind === 'Sync' ? undefined : row.checked}
              onClick={() => onRow(row.id)}
            />
          ))}
        </div>
      </div>
    </FocusScope>
  );
}
