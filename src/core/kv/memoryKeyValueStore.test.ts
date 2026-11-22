import { describe, expect, it, vi } from 'vitest';
import { MemoryKeyValueStore } from './memoryKeyValueStore';

describe('MemoryKeyValueStore', () => {
  it('reads back what was written and null for absent keys', () => {
    const store = new MemoryKeyValueStore({ a: '1' });
    expect(store.get('a')).toBe('1');
    expect(store.get('b')).toBeNull();
    store.set('b', '2');
    expect(store.get('b')).toBe('2');
    expect(store.keys().sort()).toEqual(['a', 'b']);
  });

  it('notifies key listeners and all-listeners on write and remove', () => {
    const store = new MemoryKeyValueStore();
    const onA = vi.fn();
    const onAll = vi.fn();
    const offA = store.subscribe('a', onA);
    store.subscribeAll(onAll);
    store.set('a', 'x');
    store.set('b', 'y');
    store.remove('a');
    expect(onA.mock.calls).toEqual([['x'], [null]]);
    expect(onAll).toHaveBeenCalledTimes(3);
    offA();
    store.set('a', 'z');
    expect(onA).toHaveBeenCalledTimes(2);
  });

  it('removing an absent key is silent', () => {
    const store = new MemoryKeyValueStore();
    const onAll = vi.fn();
    const off = store.subscribeAll(onAll);
    store.remove('nope');
    expect(onAll).not.toHaveBeenCalled();
    off();
    store.set('k', 'v');
    expect(onAll).not.toHaveBeenCalled();
  });
});
