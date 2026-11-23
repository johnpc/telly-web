import type { ChannelRow, RecordingRow } from '@/core/db/types';
import type { RecordingDirectory, RecordingFileHandle, RecordingWritable } from './recordingFiles';

/**
 * In-memory stand-in for the OPFS `recordings/` directory with the swap-file
 * semantics of `FileSystemWritableFileStream`: bytes written through a
 * writable only become the file's content on `close()`.
 */
export class FakeDirectory implements RecordingDirectory {
  readonly files = new Map<string, Uint8Array<ArrayBuffer>[]>();

  getFileHandle(name: string, options?: { create?: boolean }): Promise<RecordingFileHandle> {
    if (!this.files.has(name)) {
      if (options?.create !== true) return Promise.reject(new Error(`NotFoundError: ${name}`));
      this.files.set(name, []);
    }
    return Promise.resolve({
      getFile: () => Promise.resolve(new Blob(this.files.get(name) ?? [])),
      createWritable: () => Promise.resolve(this.writable(name)),
    });
  }

  removeEntry(name: string): Promise<void> {
    if (!this.files.delete(name)) return Promise.reject(new Error(`NotFoundError: ${name}`));
    return Promise.resolve();
  }

  async *keys(): AsyncIterable<string> {
    for (const name of [...this.files.keys()]) yield name;
  }

  /** The file's bytes as one array (what a player would read). */
  bytesOf(name: string): Uint8Array {
    return Uint8Array.from((this.files.get(name) ?? []).flatMap((chunk) => [...chunk]));
  }

  private writable(name: string): RecordingWritable {
    const pending: Uint8Array<ArrayBuffer>[] = [];
    return {
      write: (chunk) => {
        pending.push(chunk);
        return Promise.resolve();
      },
      close: () => {
        this.files.set(name, pending);
        return Promise.resolve();
      },
    };
  }
}

export const bytes = (...values: number[]): Uint8Array<ArrayBuffer> => new Uint8Array(values);

export function fakeChannel(name = 'News One', overrides: Partial<ChannelRow> = {}): ChannelRow {
  return {
    id: 1,
    playlistId: 1,
    number: 1,
    sortIndex: 0,
    name,
    groupTitle: 'News',
    logoUrl: null,
    streamUrl: `http://x/${name.toLowerCase().replace(/\s+/g, '-')}.ts`,
    tvgId: `${name.toLowerCase().replace(/\s+/g, '-')}.id`,
    catchupType: null,
    catchupSource: null,
    catchupDays: null,
    favorite: false,
    hidden: false,
    favoriteOrder: 0,
    blocked: false,
    customName: null,
    audioDecoder: null,
    videoDecoder: null,
    epgOffsetMinutes: 0,
    externalPlayer: null,
    epgOverride: null,
    ...overrides,
  };
}

export function fakeRecording(overrides: Partial<RecordingRow> = {}): RecordingRow {
  return {
    id: 1,
    channelKey: 'news-one.id',
    channelName: 'News One',
    streamUrl: 'http://x/news-one.ts',
    title: 'Newsroom Live',
    filePath: 'News_One-20260915-2135.ts',
    startMs: 1_000_000,
    plannedEndMs: 4_600_000,
    endMs: null,
    status: 'SCHEDULED',
    sizeBytes: 0,
    ...overrides,
  };
}

/** `fakeRecording` without its id: what `RecordingStore.schedule` / the repository insert take. */
export function fakeEntry(overrides: Partial<RecordingRow> = {}): Omit<RecordingRow, 'id'> {
  const row: Partial<RecordingRow> = fakeRecording(overrides);
  delete row.id;
  return row as Omit<RecordingRow, 'id'>;
}

/** A `Response` whose body streams `chunks` one read at a time. */
export function streamResponse(chunks: Uint8Array<ArrayBuffer>[], init: ResponseInit = {}): Response {
  const stream = new ReadableStream<Uint8Array<ArrayBuffer>>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  return new Response(stream, init);
}
