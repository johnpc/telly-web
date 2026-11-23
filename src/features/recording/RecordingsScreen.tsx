import { useEffect, useState, type JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { useFocusedId } from '@/core/focus/useFocusedId';
import { useKeyHandler } from '@/core/input/useKeyHandler';
import { useNavigator } from '@/core/navigation/useNavigator';
import { RecordingConfirmScreen } from './RecordingConfirmScreen';
import { RecordingPlayerScreen } from './RecordingPlayerScreen';
import { RecordingRowScreen } from './RecordingRowScreen';
import { RECORDINGS_EMPTY, RECORDINGS_TITLE, type RecordingListRow, recordingRowId } from './recordingRows';
import { recordingCenter } from './recordingRuntime';
import { RecordingsLibrary, confirmCopy } from './recordingsLibrary';
import { useObservableVersion, useRecordings } from './useRecordings';

/** Long-OK on the focused row asks to delete it (OK is the row's own click). */
function useLongOkDelete(library: RecordingsLibrary, rows: readonly RecordingListRow[]): void {
  const focused = useFocusedId();
  useKeyHandler((key) => {
    if (key !== 'LONG_OK' || library.confirm !== null || library.playing !== null) return false;
    const row = rows.find((candidate) => recordingRowId(candidate) === focused);
    if (row !== undefined) library.onRowLongClick(row);
    return row !== undefined;
  });
}

/** Nothing until the first read; "No recordings" when empty; else the rows. */
function Body({
  rows,
  library,
}: {
  rows: RecordingListRow[] | undefined;
  library: RecordingsLibrary;
}): JSX.Element | null {
  if (rows === undefined) return null;
  if (rows.length === 0) {
    return (
      <p className="absolute inset-0 flex items-center justify-center text-[2.25rem] text-telly-text-muted">
        {RECORDINGS_EMPTY}
      </p>
    );
  }
  return (
    <div className="absolute inset-x-[5rem] top-[10rem] bottom-0 overflow-y-auto">
      {rows.map((row) => (
        <RecordingRowScreen key={row.entry.id} row={row} onClick={() => library.onRowClick(row)} />
      ))}
    </div>
  );
}

/** The library's OK / long-OK confirms and the capture player, over the list. */
function Layers({ library }: { library: RecordingsLibrary }): JSX.Element | null {
  const { confirm, playing } = library;
  if (playing !== null) return <RecordingPlayerScreen row={playing} onExit={() => library.stopPlaying()} />;
  if (confirm === null) return null;
  const copy = confirmCopy(confirm);
  return (
    <RecordingConfirmScreen
      {...copy}
      onAccept={() => library.accept()}
      onDismiss={() => library.dismissConfirm()}
    />
  );
}

/**
 * The Recordings / DVR library (Route.Recordings; Android `RecordingsScreen`):
 * reached from the quick-bar's Recordings slot and the guide rail's DVR icon.
 * Rows list title / channel / start / status; OK plays DONE captures
 * fullscreen, stops or cancels the rest (GuidedStep confirm), long-OK deletes.
 * Title top-right in the History-screen idiom; BACK pops to the opener.
 */
export function RecordingsScreen(): JSX.Element {
  const navigator = useNavigator();
  const [library] = useState(() => new RecordingsLibrary(recordingCenter));
  useObservableVersion(library);
  const rows = useRecordings();
  useEffect(() => library.retainStopped(rows ?? []), [library, rows]);
  useLongOkDelete(library, rows ?? []);
  return (
    <FocusScope id="recordings" autoFocus="first" onBack={() => navigator.pop()}>
      <div className="relative h-full w-full bg-telly-onboarding-bg" data-testid="recordings-screen">
        <h1 className="absolute top-[2.5rem] right-[3rem] text-[3.5rem] text-white">{RECORDINGS_TITLE}</h1>
        <Body rows={rows} library={library} />
        <Layers library={library} />
      </div>
    </FocusScope>
  );
}
