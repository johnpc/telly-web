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
 * status; long-OK deletes. Phone portrait reflows the row onto two lines
 * (title, then channel · start · detail) so a long detail — "Failed ·
 * Provider allows one stream at a time" — wraps instead of clipping.
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
      className="flex h-[4.875rem] w-full items-center gap-[1.25rem] rounded px-[1rem] text-left text-telly-text portrait:h-auto portrait:flex-wrap portrait:gap-x-[1rem] portrait:gap-y-[0.25rem] portrait:py-[0.75rem]"
      focusedClassName="bg-telly-focus-fill focused:text-telly-focus-text"
    >
      {row.status === 'RECORDING' && <RecBadge />}
      <span className="flex-1 truncate text-[1.875rem] portrait:basis-full" data-testid="recording-title">
        {row.entry.title}
      </span>
      <span
        className="w-[18.75rem] truncate text-[1.75rem] opacity-70 portrait:w-auto portrait:max-w-[45%]"
        data-testid="recording-channel"
      >
        {row.entry.channelName}
      </span>
      <span className="w-[21.25rem] truncate text-[1.625rem] opacity-70 portrait:w-auto">{row.dateText}</span>
      <span className="text-[1.625rem] opacity-70 portrait:basis-full" data-testid="recording-detail">
        {row.detailText}
      </span>
    </Focusable>
  );
}
