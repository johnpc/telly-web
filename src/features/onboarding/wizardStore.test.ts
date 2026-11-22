import { describe, expect, it, vi } from 'vitest';
import { WizardStore } from './wizardStore';

describe('WizardStore', () => {
  it('patches immutably and notifies subscribers until they unsubscribe', () => {
    const store = new WizardStore();
    const before = store.getState();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.patch({ url: 'http://x' });
    expect(store.state.url).toBe('http://x');
    expect(before.url).toBe('');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.patch({ url: 'http://y' });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
