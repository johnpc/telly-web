/**
 * The automatic backup file in the Origin Private File System: the web
 * stand-in for Android's `Documents/telly/telly-backup.json`. It lives in
 * the browser profile (CLAUDE.md decisions log), so a cleared site wipes it;
 * `readAutoBackup` feeds the welcome screen's "Restore previous setup".
 */
export const AUTO_BACKUP_FILE_NAME = 'telly-backup.json';

/** The slice of `FileSystemDirectoryHandle` the file touches; tests pass a fake. */
export type BackupDirectory = Pick<FileSystemDirectoryHandle, 'getFileHandle' | 'removeEntry'>;

export type DirectoryProvider = () => Promise<BackupDirectory | null>;

/** The OPFS root, or null where the API is missing (older TV browsers) or denied. */
export const opfsRoot: DirectoryProvider = async () => {
  if (typeof navigator === 'undefined' || typeof navigator.storage?.getDirectory !== 'function') return null;
  try {
    return await navigator.storage.getDirectory();
  } catch {
    return null;
  }
};

/** Writes `json` as the backup file; false when the platform has no OPFS. */
export async function writeAutoBackup(json: string, root: DirectoryProvider = opfsRoot): Promise<boolean> {
  const directory = await root();
  if (directory === null) return false;
  const handle = await directory.getFileHandle(AUTO_BACKUP_FILE_NAME, { create: true });
  const writable = await handle.createWritable();
  await writable.write(json);
  await writable.close();
  return true;
}

/** The backup file's text, or null when absent/unreadable. */
export async function readAutoBackup(root: DirectoryProvider = opfsRoot): Promise<string | null> {
  try {
    const directory = await root();
    if (directory === null) return null;
    const handle = await directory.getFileHandle(AUTO_BACKUP_FILE_NAME);
    return await (await handle.getFile()).text();
  } catch {
    return null;
  }
}

/** Removes the backup file; absent files are a no-op. */
export async function deleteAutoBackup(root: DirectoryProvider = opfsRoot): Promise<void> {
  try {
    await (await root())?.removeEntry(AUTO_BACKUP_FILE_NAME);
  } catch {
    // Nothing to delete.
  }
}
