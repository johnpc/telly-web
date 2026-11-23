import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecordingFiles, fileStamp, opfsRecordingsDirectory, sanitizeName } from './recordingFiles';
import { FakeDirectory, bytes } from './recordingTestSupport';

const stamp = (): string => '20260915-2135';

describe('RecordingFiles', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('derives capture names from channel + stamp and dedupes with a suffix', async () => {
    const dir = new FakeDirectory();
    const files = new RecordingFiles(() => Promise.resolve(dir), stamp);
    expect(await files.newFileName('News One', 0, 'ts')).toBe('News_One-20260915-2135.ts');
    const writable = await files.open('News_One-20260915-2135.ts');
    await writable.close();
    expect(await files.newFileName('News One', 0, 'ts')).toBe('News_One-20260915-2135-1.ts');
    expect(await files.newFileName('HLS Live', 0, 'mp4')).toBe('HLS_Live-20260915-2135.mp4');
  });

  it('sizes, reads, deletes and sums capture files', async () => {
    const dir = new FakeDirectory();
    const files = new RecordingFiles(() => Promise.resolve(dir), stamp);
    const writable = await files.open('a.ts');
    await writable.write(bytes(1, 2, 3));
    expect(await files.sizeOf('a.ts')).toBe(0); // swap-file semantics: nothing until close
    await writable.close();
    expect(await files.sizeOf('a.ts')).toBe(3);
    expect(await files.exists('a.ts')).toBe(true);
    expect(await files.blobOf('missing.ts')).toBeNull();
    expect(await files.sizeOf('missing.ts')).toBe(0);
    const other = await files.open('b.ts');
    await other.write(bytes(9));
    await other.close();
    expect(await files.usedBytes()).toBe(4);
    await files.delete('a.ts');
    await files.delete('a.ts'); // already gone: no throw
    await files.delete('   ');
    expect(await files.exists('a.ts')).toBe(false);
    await files.deleteAllFiles();
    expect(await files.usedBytes()).toBe(0);
  });

  it('sanitizes names and stamps the local start time', () => {
    expect(sanitizeName('News One / HD')).toBe('News_One___HD');
    expect(sanitizeName('')).toBe('recording');
    const d = new Date(2026, 8, 15, 21, 35);
    expect(fileStamp(d.getTime())).toBe('20260915-2135');
  });

  it('opens recordings/ inside the Origin Private File System by default', async () => {
    const recordings = { name: 'recordings' };
    const getDirectoryHandle = vi.fn().mockResolvedValue(recordings);
    vi.stubGlobal('navigator', { storage: { getDirectory: () => Promise.resolve({ getDirectoryHandle }) } });
    expect(await opfsRecordingsDirectory()).toBe(recordings);
    expect(getDirectoryHandle).toHaveBeenCalledWith('recordings', { create: true });
  });
});
