import { describe, expect, it } from 'vitest';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { GROUP_KEY, GuideGroupMemory } from './guideGroupMemory';
import { HINT_KEY, claimHint } from './guideHint';
import { ALL_CHANNELS } from './guideRowsBuilder';

describe('claimHint', () => {
  it('shows the hint exactly once per install', () => {
    const store = new MemoryKeyValueStore();
    expect(claimHint(store)).toBe(true);
    expect(store.get(HINT_KEY)).toBe('1');
    expect(claimHint(store)).toBe(false);
  });
});

describe('GuideGroupMemory', () => {
  it('persists the picked group and falls back to All channels when it vanished', () => {
    const store = new MemoryKeyValueStore();
    const memory = new GuideGroupMemory(store);
    expect(memory.value).toBe(ALL_CHANNELS);
    expect(memory.select('Sports')).toBe(true);
    expect(memory.select('Sports')).toBe(false);
    expect(store.get(GROUP_KEY)).toBe('Sports');
    expect(new GuideGroupMemory(store).value).toBe('Sports');
    expect(memory.validate(['Sports'])).toBe(false);
    expect(memory.validate(['News'])).toBe(true);
    expect(memory.value).toBe(ALL_CHANNELS);
  });
});
