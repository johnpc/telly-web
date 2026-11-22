import { describe, expect, it, vi } from 'vitest';
import { MemoryKeyValueStore } from '../kv/memoryKeyValueStore';
import { SettingsRepository } from './settingsRepository';
import { TellySettings } from './tellySettings';

describe('SettingsRepository', () => {
  it('returns defaults until set, then the decoded value', () => {
    const repo = new SettingsRepository(new MemoryKeyValueStore());
    expect(repo.get(TellySettings.EPG_PAST_DAYS_TO_KEEP)).toBe(7);
    repo.set(TellySettings.EPG_PAST_DAYS_TO_KEEP, 3);
    expect(repo.get(TellySettings.EPG_PAST_DAYS_TO_KEEP)).toBe(3);
    expect(repo.snapshot()).toEqual({ epg_past_days_to_keep: '3' });
  });

  it('observes one setting and all changes', () => {
    const repo = new SettingsRepository(new MemoryKeyValueStore());
    const onDays = vi.fn();
    const onAny = vi.fn();
    const off = repo.observe(TellySettings.EPG_PAST_DAYS_TO_KEEP, onDays);
    repo.subscribeChanges(onAny);
    repo.set(TellySettings.EPG_PAST_DAYS_TO_KEEP, 2);
    repo.set(TellySettings.CONFIRM_EXIT, true);
    expect(onDays.mock.calls).toEqual([[2]]);
    expect(onAny).toHaveBeenCalledTimes(2);
    off();
    repo.set(TellySettings.EPG_PAST_DAYS_TO_KEEP, 9);
    expect(onDays).toHaveBeenCalledTimes(1);
  });

  it('writeRaw/removeRaw operate on raw keys', () => {
    const repo = new SettingsRepository(new MemoryKeyValueStore());
    repo.writeRaw('playlist_enabled:u', 'false');
    expect(repo.snapshot()).toEqual({ 'playlist_enabled:u': 'false' });
    repo.removeRaw('playlist_enabled:u');
    expect(repo.snapshot()).toEqual({});
  });

  it('restore replaces the whole persisted map', () => {
    const repo = new SettingsRepository(new MemoryKeyValueStore({ stale: '1', keep: 'old' }));
    repo.restore({ keep: 'new', added: 'x' });
    expect(repo.snapshot()).toEqual({ keep: 'new', added: 'x' });
  });
});
