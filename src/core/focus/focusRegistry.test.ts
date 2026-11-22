import { describe, expect, it } from 'vitest';
import { FocusRegistry } from './focusRegistry';

function entry(registry: FocusRegistry, id: string, scope: string): HTMLElement {
  const element = document.createElement('div');
  document.body.appendChild(element);
  registry.add({ id, scope, element });
  return element;
}

describe('FocusRegistry', () => {
  it('keeps the scope stack and answers nesting questions', () => {
    const r = new FocusRegistry();
    r.pushScope({ id: 'screen', parent: null, trap: false });
    r.pushScope({ id: 'rail', parent: 'screen', trap: false });
    r.pushScope({ id: 'modal', parent: 'screen', trap: true });
    r.pushScope({ id: 'list', parent: 'modal', trap: false });
    expect(r.scopesTopDown()).toEqual(['list', 'modal', 'rail', 'screen']);
    expect(r.isWithin('list', 'modal')).toBe(true);
    expect(r.isWithin('list', 'screen')).toBe(true);
    expect(r.isWithin('rail', 'modal')).toBe(false);
    expect(r.isWithin('unknown', 'screen')).toBe(false);
    expect(r.activeTrap()).toBe('modal');
    expect(r.isActive('list')).toBe(true);
    expect(r.isActive('rail')).toBe(false);
    r.popScope('modal');
    expect(r.activeTrap()).toBeNull();
    expect(r.isActive('rail')).toBe(true);
    expect(r.isActive('orphan')).toBe(false);
    expect(new FocusRegistry().isActive('anything')).toBe(true);
  });

  it('re-pushing a scope id moves it to the top instead of duplicating it', () => {
    const r = new FocusRegistry();
    r.pushScope({ id: 'a', parent: null, trap: false });
    r.pushScope({ id: 'b', parent: null, trap: false });
    r.pushScope({ id: 'a', parent: null, trap: false });
    expect(r.scopesTopDown()).toEqual(['a', 'b']);
    r.popScope('nope');
    expect(r.scopesTopDown()).toEqual(['a', 'b']);
  });

  it('lists entries in DOM order, filtered by the active layer or a scope subtree', () => {
    const r = new FocusRegistry();
    entry(r, 'a', 'screen');
    const b = entry(r, 'b', 'rail');
    b.before(entry(r, 'c', 'modal'));
    r.pushScope({ id: 'screen', parent: null, trap: false });
    r.pushScope({ id: 'rail', parent: 'screen', trap: false });
    expect(r.activeEntries().map((e) => e.id)).toEqual(['a', 'b']);
    expect(r.entriesUnder('screen').map((e) => e.id)).toEqual(['a', 'b']);
    r.pushScope({ id: 'modal', parent: 'screen', trap: false });
    expect(r.activeEntries().map((e) => e.id)).toEqual(['a', 'c', 'b']);
    r.pushScope({ id: 'modal', parent: 'screen', trap: true });
    expect(r.activeEntries().map((e) => e.id)).toEqual(['c']);
    expect(r.entriesUnder('screen').map((e) => e.id)).toEqual(['c']);
    r.remove('c');
    expect(r.get('c')).toBeUndefined();
    expect(r.activeEntries()).toEqual([]);
  });
});
