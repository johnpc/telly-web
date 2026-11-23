import { describe, expect, it, vi } from 'vitest';
import { recordingRows } from './recordingRows';
import { RecordingsLibrary, confirmCopy, stopConfirmCopy } from './recordingsLibrary';
import { fakeRecording } from './recordingTestSupport';

const rowOf = (status: string, id = 1): ReturnType<typeof recordingRows>[number] => {
  const [row] = recordingRows([fakeRecording({ id, status })]);
  if (row === undefined) throw new Error('no row');
  return row;
};

function rig(): {
  library: RecordingsLibrary;
  center: { stop: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
} {
  const center = { stop: vi.fn().mockResolvedValue(undefined), delete: vi.fn().mockResolvedValue(undefined) };
  return { library: new RecordingsLibrary(center), center };
}

describe('RecordingsLibrary', () => {
  it('OK plays DONE rows and asks before stopping, cancelling or deleting the rest', () => {
    const { library } = rig();
    library.onRowClick(rowOf('DONE'));
    expect(library.playing?.entry.id).toBe(1);
    expect(library.confirm).toBeNull();
    library.stopPlaying();
    expect(library.playing).toBeNull();
    library.onRowClick(rowOf('RECORDING'));
    expect(library.confirm?.kind).toBe('Stop');
    library.onRowClick(rowOf('SCHEDULED'));
    expect(library.confirm?.kind).toBe('Cancel');
    library.onRowClick(rowOf('FAILED'));
    expect(library.confirm?.kind).toBe('Delete');
    library.dismissConfirm();
    expect(library.confirm).toBeNull();
    library.onRowLongClick(rowOf('DONE'));
    expect(library.confirm?.kind).toBe('Delete');
  });

  it('accepting Stop asks the center; the row then reads STOPPING, which OK plays instead of re-asking', async () => {
    const { library, center } = rig();
    library.onRowClick(rowOf('RECORDING', 7));
    expect(library.mode.kind).toBe('Confirming');
    library.accept();
    expect(center.stop).toHaveBeenCalledWith(7);
    expect(library.mode).toEqual({ kind: 'Browsing' });
    library.onRowClick(rowOf('STOPPING', 7));
    expect(library.playing?.entry.id).toBe(7);
    library.dismissConfirm(); // not confirming: no-op
    expect(library.playing?.entry.id).toBe(7);
    library.stopPlaying();
    library.stopPlaying();
    library.accept(); // nothing pending: no-op
    expect(center.delete).not.toHaveBeenCalled();
    await Promise.resolve();
  });

  it('accepting Cancel or Delete removes the entry', () => {
    const { library, center } = rig();
    library.onRowClick(rowOf('SCHEDULED', 3));
    library.accept();
    library.onRowLongClick(rowOf('DONE', 4));
    library.accept();
    expect(center.delete.mock.calls).toEqual([[3], [4]]);
  });

  it('carries the Android confirm copy', () => {
    expect(confirmCopy({ kind: 'Stop', row: rowOf('RECORDING') })).toEqual({
      title: 'Stop recording?',
      body: '"Newsroom Live" will stop and stay in the library',
      primary: 'Stop',
    });
    expect(confirmCopy({ kind: 'Cancel', row: rowOf('SCHEDULED') })).toMatchObject({
      title: 'Cancel scheduled recording?',
      primary: 'Remove',
    });
    expect(confirmCopy({ kind: 'Delete', row: rowOf('DONE') })).toMatchObject({
      title: 'Delete recording?',
      body: '"Newsroom Live" and its file will be deleted',
      primary: 'Delete',
    });
    expect(stopConfirmCopy('News One')).toEqual({
      title: 'Stop recording?',
      body: 'The recording of "News One" will stop and stay in the Recordings library',
      primary: 'Stop',
    });
  });
});
