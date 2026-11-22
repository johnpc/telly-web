import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalStorageKeyValueStore, STORAGE_PREFIX } from './localStorageKeyValueStore';

describe('LocalStorageKeyValueStore', () => {
  beforeEach(() => localStorage.clear());

  it('namespaces keys and lists only its own', () => {
    localStorage.setItem('foreign', 'x');
    const store = new LocalStorageKeyValueStore(localStorage, null);
    store.set('a', '1');
    expect(localStorage.getItem(`${STORAGE_PREFIX}a`)).toBe('1');
    expect(store.get('a')).toBe('1');
    expect(store.get('missing')).toBeNull();
    expect(store.keys()).toEqual(['a']);
    store.remove('a');
    expect(store.keys()).toEqual([]);
  });

  it('notifies listeners on local writes', () => {
    const store = new LocalStorageKeyValueStore(localStorage, null);
    const onA = vi.fn();
    const onAll = vi.fn();
    store.subscribe('a', onA);
    store.subscribeAll(onAll);
    store.set('a', '1');
    store.remove('a');
    expect(onA.mock.calls).toEqual([['1'], [null]]);
    expect(onAll).toHaveBeenCalledTimes(2);
  });

  it('relays cross-tab storage events for its own keys only', () => {
    const target = new EventTarget();
    const store = new LocalStorageKeyValueStore(localStorage, target);
    const onA = vi.fn();
    store.subscribe('a', onA);
    const fire = (key: string | null, newValue: string | null, area: Storage | null = localStorage) =>
      target.dispatchEvent(new StorageEvent('storage', { key, newValue, storageArea: area }));
    fire(`${STORAGE_PREFIX}a`, 'remote');
    fire('other', 'ignored');
    fire(`${STORAGE_PREFIX}a`, 'ignored', sessionStorage);
    fire(null, null);
    expect(onA.mock.calls).toEqual([['remote']]);
  });

  it('defaults to window.localStorage', () => {
    const store = new LocalStorageKeyValueStore();
    store.set('d', 'v');
    expect(localStorage.getItem(`${STORAGE_PREFIX}d`)).toBe('v');
  });
});
