import { pad2 } from '@/core/time/timeParts';

/** The slice of a `FileSystemWritableFileStream` a capture needs. */
export interface RecordingWritable {
  write(chunk: Uint8Array<ArrayBuffer>): Promise<void>;
  close(): Promise<void>;
}

/** The slice of a `FileSystemFileHandle` the slice needs. */
export interface RecordingFileHandle {
  getFile(): Promise<Blob>;
  createWritable(): Promise<RecordingWritable>;
}

/** The slice of a `FileSystemDirectoryHandle` the slice needs (`keys()` is not in TS's DOM lib). */
export interface RecordingDirectory {
  getFileHandle(name: string, options?: { create?: boolean }): Promise<RecordingFileHandle>;
  removeEntry(name: string): Promise<void>;
  keys(): AsyncIterable<string>;
}

export type DirectoryProvider = () => Promise<RecordingDirectory>;

/** `recordings/` inside the Origin Private File System (the web's "app files dir"). */
export const opfsRecordingsDirectory: DirectoryProvider = async () => {
  const root = await navigator.storage.getDirectory();
  return (await root.getDirectoryHandle('recordings', { create: true })) as unknown as RecordingDirectory;
};

/** "20260915-2135" in the browser's local zone. */
export function fileStamp(startMs: number): string {
  const d = new Date(startMs);
  const date = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
  return `${date}-${pad2(d.getHours())}${pad2(d.getMinutes())}`;
}

export function sanitizeName(name: string): string {
  const safe = name.replace(/[^A-Za-z0-9._-]/g, '_');
  return safe.trim() === '' ? 'recording' : safe;
}

/**
 * Owns the capture files (Android `RecordingFiles`): derives capture names
 * from channel + start stamp (`.ts` for byte copies and TS-segment HLS,
 * `.mp4` for fMP4 HLS), opens them for appending, deletes them and sums
 * storage for the settings pane. The directory is injected, so everything
 * here is testable against an in-memory fake.
 */
export class RecordingFiles {
  constructor(
    private readonly directory: DirectoryProvider = opfsRecordingsDirectory,
    private readonly stamp: (startMs: number) => string = fileStamp,
  ) {}

  /** A fresh capture name "News_One-20260915-2135.ts" (deduped suffix). */
  async newFileName(channelName: string, startMs: number, extension: string): Promise<string> {
    const base = `${sanitizeName(channelName)}-${this.stamp(startMs)}`;
    let candidate = `${base}.${extension}`;
    for (let suffix = 1; await this.exists(candidate); suffix += 1)
      candidate = `${base}-${suffix}.${extension}`;
    return candidate;
  }

  async open(name: string): Promise<RecordingWritable> {
    const handle = await (await this.directory()).getFileHandle(name, { create: true });
    return handle.createWritable();
  }

  async blobOf(name: string): Promise<Blob | null> {
    try {
      return await (await (await this.directory()).getFileHandle(name)).getFile();
    } catch {
      return null;
    }
  }

  async sizeOf(name: string): Promise<number> {
    return (await this.blobOf(name))?.size ?? 0;
  }

  async exists(name: string): Promise<boolean> {
    return (await this.blobOf(name)) !== null;
  }

  async delete(name: string): Promise<void> {
    if (name.trim() === '') return;
    await (await this.directory()).removeEntry(name).catch(() => undefined);
  }

  /** Settings "Delete all recordings": clears the whole capture dir. */
  async deleteAllFiles(): Promise<void> {
    const dir = await this.directory();
    for (const name of await collect(dir.keys())) await dir.removeEntry(name).catch(() => undefined);
  }

  /** Bytes of every capture file. */
  async usedBytes(): Promise<number> {
    const dir = await this.directory();
    let total = 0;
    for (const name of await collect(dir.keys())) total += await this.sizeOf(name);
    return total;
  }
}

async function collect(names: AsyncIterable<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const name of names) out.push(name);
  return out;
}
