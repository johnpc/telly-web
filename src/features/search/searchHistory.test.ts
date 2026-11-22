import { describe, expect, it, vi } from 'vitest';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { SEARCH_HISTORY_KEY, SEARCH_HISTORY_MAX, SearchHistory, parseHistory } from './searchHistory';

describe('SearchHistory', () => {
  it('records committed queries most recent first, deduped case-insensitively, capped', () => {
    const history = new SearchHistory(new MemoryKeyValueStore());
    history.record(' news ');
    history.record('sport');
    history.record('NEWS');
    expect(history.list()).toEqual(['NEWS', 'sport']);
    for (let i = 0; i < SEARCH_HISTORY_MAX + 5; i += 1) history.record(`q${i}`);
    expect(history.list()).toHaveLength(SEARCH_HISTORY_MAX);
    expect(history.list()[0]).toBe(`q${SEARCH_HISTORY_MAX + 4}`);
  });

  it('ignores blank queries and honors the save toggle', () => {
    let save = true;
    const history = new SearchHistory(new MemoryKeyValueStore(), () => save);
    history.record('   ');
    expect(history.list()).toEqual([]);
    save = false;
    history.record('news');
    expect(history.list()).toEqual([]);
  });

  it('clears, notifies subscribers and exposes the raw snapshot', () => {
    const store = new MemoryKeyValueStore();
    const history = new SearchHistory(store);
    const listener = vi.fn();
    history.subscribe(listener);
    history.record('news');
    expect(history.serialized()).toBe('news');
    expect(store.get(SEARCH_HISTORY_KEY)).toBe('news');
    history.clear();
    expect(history.list()).toEqual([]);
    expect(history.serialized()).toBe('');
    expect(listener).toHaveBeenCalledTimes(2);
    expect(parseHistory('a\n\nb')).toEqual(['a', 'b']);
  });
});
