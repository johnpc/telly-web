import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { definedOnly, recordingStorage, useSettingsFeeds } from './useSettingsFeeds';

describe('useSettingsFeeds', () => {
  it('drops loading feeds and sums recording storage', async () => {
    expect(definedOnly<{ a: number; b: number }>({ a: 1, b: undefined })).toEqual({ a: 1 });
    const storage = await recordingStorage(async () => ({ quota: 100, usage: 40 }));
    expect(storage).toEqual({ usedBytes: 0, freeBytes: 60 });
    const failing = await recordingStorage(async () => {
      throw new Error('no estimate');
    });
    expect(failing.freeBytes).toBe(0);
    expect((await recordingStorage()).freeBytes).toBe(0);
  });

  it('resolves every feed from the default database', async () => {
    const { result } = renderHook(() => useSettingsFeeds());
    await waitFor(() => expect(result.current.playlists).toEqual([]));
    expect(result.current.epgSources).toEqual([]);
    expect(result.current.reminders).toEqual([]);
    expect(result.current.blockedChannels).toEqual([]);
    expect(result.current.autoBackup).toBeDefined();
  });
});
