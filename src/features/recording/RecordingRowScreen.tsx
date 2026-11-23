import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { REC_BADGE, type RecordingListRow, recordingRowId } from './recordingRows';

/** The red REC pill on in-progress rows (Android `RecordingsScreenRecBadge`, #E53935). */
export function RecBadge(): JSX.Element {
  return (
    <span
      className="rounded-[0.25rem] bg-[#e53935] px-[0.5rem] py-[0.125rem] text-[1.25rem] font-bold text-white"
      data-testid="rec-badge"
    >
      {REC_BADGE}
    </span>
  );
}

/**
 * One Recordings-library row in the app's 39 dp channel-row idiom (Android
 * `RecordingsScreenRow`): title (with a live REC badge while capturing),
 * channel, start stamp and the status detail. OK plays/stops/cancels per
 * status; long-OK deletes.
 */
export function RecordingRowScreen({
  row,
  onClick,
}: {
  row: RecordingListRow;
  onClick: () => void;
}): JSX.Element {
  return (
    <Focusable
      focusId={recordingRowId(row)}
      as="button"
      data-testid="recording-row"
      data-status={row.status}
      onClick={onClick}
      className="flex h-[4.875rem] w-full items-center gap-[1.25rem] rounded px-[1rem] text-left text-telly-text"
      focusedClassName="bg-telly-focus-fill focused:text-telly-focus-text"
    >
      {row.status === 'RECORDING' && <RecBadge />}
      <span className="flex-1 truncate text-[1.875rem]" data-testid="recording-title">
        {row.entry.title}
      </span>
      <span className="w-[18.75rem] truncate text-[1.75rem] opacity-70" data-testid="recording-channel">
        {row.entry.channelName}
      </span>
      <span className="w-[21.25rem] truncate text-[1.625rem] opacity-70">{row.dateText}</span>
      <span className="text-[1.625rem] opacity-70" data-testid="recording-detail">
        {row.detailText}
      </span>
    </Focusable>
  );
}
