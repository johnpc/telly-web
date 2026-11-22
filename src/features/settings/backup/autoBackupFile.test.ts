import { describe, expect, it, vi } from 'vitest';
import {
  AUTO_BACKUP_FILE_NAME,
  type BackupDirectory,
  deleteAutoBackup,
  opfsRoot,
  readAutoBackup,
  writeAutoBackup,
} from './autoBackupFile';

/** An in-memory stand-in for the OPFS root (one file). */
function fakeDirectory(): BackupDirectory & { files: Map<string, string> } {
  const files = new Map<string, string>();
  const handle = (name: string): FileSystemFileHandle =>
    ({
      getFile: async () => new File([files.get(name) ?? ''], name),
      createWritable: async () =>
        ({
          write: async (chunk: string) => void files.set(name, chunk),
          close: async () => undefined,
        }) as unknown as FileSystemWritableFileStream,
    }) as unknown as FileSystemFileHandle;
  return {
    files,
    getFileHandle: async (name: string, options?: FileSystemGetFileOptions) => {
      if (!files.has(name) && options?.create !== true) throw new DOMException('missing', 'NotFoundError');
      return handle(name);
    },
    removeEntry: async (name: string) => void files.delete(name),
  };
}

describe('autoBackupFile', () => {
  it('writes, reads back and deletes the backup file', async () => {
    const dir = fakeDirectory();
    const root = async () => dir;
    expect(await readAutoBackup(root)).toBeNull();
    expect(await writeAutoBackup('{"v":1}', root)).toBe(true);
    expect(dir.files.get(AUTO_BACKUP_FILE_NAME)).toBe('{"v":1}');
    expect(await readAutoBackup(root)).toBe('{"v":1}');
    await deleteAutoBackup(root);
    expect(await readAutoBackup(root)).toBeNull();
  });

  it('degrades to no-ops where the platform has no OPFS', async () => {
    const none = async () => null;
    expect(await writeAutoBackup('x', none)).toBe(false);
    expect(await readAutoBackup(none)).toBeNull();
    await deleteAutoBackup(none);
    await deleteAutoBackup(async () => {
      throw new Error('denied');
    });
    expect(await opfsRoot()).toBeNull();
    const getDirectory = vi.fn(async () => fakeDirectory());
    vi.stubGlobal('navigator', { storage: { getDirectory } });
    expect(await opfsRoot()).not.toBeNull();
    getDirectory.mockRejectedValueOnce(new Error('denied'));
    expect(await opfsRoot()).toBeNull();
    vi.unstubAllGlobals();
  });
});
