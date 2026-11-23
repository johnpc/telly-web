import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FocusEngine } from './focusEngine';
import { node, place } from './testLayout';

interface World {
  engine: FocusEngine;
  root: HTMLElement;
  add(id: string, box: Parameters<typeof node>[2], scope?: string): { el: HTMLElement; remove: () => void };
}

function world(): World {
  const engine = new FocusEngine((work) => work());
  const root = document.createElement('div');
  document.body.appendChild(root);
  return {
    engine,
    root,
    add(id, box, scope = 'screen') {
      const el = node(root, id, box);
      const remove = engine.register(id, scope, el);
      return { el, remove };
    },
  };
}

/** A 2×2 grid: a b / c d, each 100×100 with a 20 px gap. */
function grid(w: World): void {
  w.add('a', { x: 0, y: 0 });
  w.add('b', { x: 120, y: 0 });
  w.add('c', { x: 0, y: 120 });
  w.add('d', { x: 120, y: 120 });
}

describe('FocusEngine', () => {
  const scroll = vi.fn();
  beforeEach(() => {
    Element.prototype.scrollIntoView = scroll;
  });
  afterEach(() => {
    document.body.innerHTML = '';
    scroll.mockClear();
  });

  it('moves through a grid geometrically and never wraps', () => {
    const w = world();
    grid(w);
    expect(w.engine.focus('a')).toBe(true);
    expect(w.engine.move('RIGHT')).toBe(true);
    expect(w.engine.current).toBe('b');
    expect(w.engine.move('DOWN')).toBe(true);
    expect(w.engine.current).toBe('d');
    expect(w.engine.move('LEFT')).toBe(true);
    expect(w.engine.current).toBe('c');
    expect(w.engine.move('UP')).toBe(true);
    expect(w.engine.current).toBe('a');
    expect(w.engine.move('LEFT')).toBe(false);
    expect(w.engine.move('UP')).toBe(false);
    expect(w.engine.current).toBe('a');
    expect(document.activeElement?.getAttribute('data-focus-id')).toBe('a');
    expect(scroll).toHaveBeenLastCalledWith({ block: 'nearest', inline: 'nearest' });
  });

  it('prefers the nearest in-beam candidate and skips hidden (zero-size) elements', () => {
    const w = world();
    w.add('a', { x: 0, y: 0 });
    w.add('hidden', { x: 110, y: 0, w: 0, h: 0 });
    w.add('far', { x: 400, y: 10 });
    w.add('offbeam', { x: 120, y: 200 });
    w.engine.focus('a');
    w.engine.move('RIGHT');
    expect(w.engine.current).toBe('far');
  });

  it('honours data-focus-* overrides when they point at a registered element', () => {
    const w = world();
    grid(w);
    const a = w.add('a2', { x: 300, y: 300 }).el;
    a.dataset.focusRight = 'c';
    a.dataset.focusUp = 'ghost';
    w.engine.focus('a2');
    w.engine.move('RIGHT');
    expect(w.engine.current).toBe('c');
    w.engine.focus('a2');
    w.engine.move('UP');
    expect(w.engine.current).toBe('d');
  });

  it('focuses the first element (DOM order) when nothing is focused yet', () => {
    const w = world();
    expect(w.engine.move('DOWN')).toBe(false);
    expect(w.engine.focusFirst()).toBe(false);
    grid(w);
    expect(w.engine.move('DOWN')).toBe(true);
    expect(w.engine.current).toBe('a');
    expect(w.engine.focus('nope')).toBe(false);
  });

  it('traps arrows inside a modal scope and restores the remembered focus when it pops', () => {
    const w = world();
    grid(w);
    const popScreen = w.engine.pushScope({ id: 'screen' });
    expect(w.engine.current).toBe('a');
    w.engine.move('RIGHT');
    expect(w.engine.current).toBe('b');
    const m1 = w.add('m1', { x: 40, y: 40, w: 60, h: 60 }, 'modal');
    const m2 = w.add('m2', { x: 40, y: 110, w: 60, h: 60 }, 'modal');
    const popModal = w.engine.pushScope({ id: 'modal', parent: 'screen', trap: true });
    expect(w.engine.current).toBe('m1');
    expect(w.engine.move('RIGHT')).toBe(false);
    expect(w.engine.move('DOWN')).toBe(true);
    expect(w.engine.current).toBe('m2');
    expect(w.engine.focusFirst('screen')).toBe(true);
    expect(w.engine.current).toBe('m1');
    // React unmounts the modal's elements and pops its scope in one commit; recovery runs after both.
    popModal();
    m1.remove();
    m2.remove();
    expect(w.engine.current).toBe('b');
    popScreen();
    expect(w.engine.current).toBe('b');
  });

  it('a scope nested inside the trap stays reachable', () => {
    const w = world();
    w.add('bg', { x: 0, y: 0 });
    w.engine.pushScope({ id: 'screen' });
    w.add('m', { x: 200, y: 0 }, 'modal');
    w.add('row', { x: 200, y: 200 }, 'list');
    w.engine.pushScope({ id: 'list', parent: 'modal' });
    w.engine.pushScope({ id: 'modal', parent: 'screen', trap: true });
    expect(w.engine.current).toBe('m');
    expect(w.engine.move('DOWN')).toBe(true);
    expect(w.engine.current).toBe('row');
    expect(w.engine.move('LEFT')).toBe(false);
  });

  it('autoFocus modes: first always, remembered only when focus is outside the layer, false never', () => {
    const w = world();
    grid(w);
    w.engine.pushScope({ id: 'screen', autoFocus: false });
    expect(w.engine.current).toBeNull();
    w.engine.focus('d');
    const pop = w.engine.pushScope({ id: 'screen', autoFocus: 'remembered' });
    expect(w.engine.current).toBe('d');
    w.engine.pushScope({ id: 'screen', autoFocus: 'first' });
    expect(w.engine.current).toBe('a');
    pop();
    w.engine.focus('c');
    w.engine.pushScope({ id: 'other', autoFocus: 'remembered' });
    expect(w.engine.current).toBe('c');
  });

  it('remembers per scope across unmount and remount (screen A → screen B → screen A)', () => {
    const w = world();
    const cells = [w.add('a', { x: 0, y: 0 }, 'A'), w.add('b', { x: 120, y: 0 }, 'A')];
    const popA = w.engine.pushScope({ id: 'A' });
    w.engine.focus('b');
    popA();
    cells.forEach((cell) => cell.remove());
    expect(w.engine.current).toBeNull();
    const x = w.add('x', { x: 500, y: 500 }, 'B');
    const popB = w.engine.pushScope({ id: 'B' });
    expect(w.engine.current).toBe('x');
    popB();
    x.remove();
    expect(w.engine.current).toBeNull();
    w.add('a', { x: 0, y: 0 }, 'A');
    w.add('b', { x: 120, y: 0 }, 'A');
    w.engine.pushScope({ id: 'A' });
    expect(w.engine.current).toBe('b');
  });

  it('a remembered element that disappeared falls back to the first of the layer', () => {
    const w = world();
    grid(w);
    const d = w.add('d2', { x: 240, y: 120 });
    w.engine.pushScope({ id: 'screen' });
    w.engine.focus('d2');
    const m = w.add('m', { x: 500, y: 500 }, 'modal');
    const popModal = w.engine.pushScope({ id: 'modal', parent: 'screen', trap: true });
    d.remove();
    popModal();
    m.remove();
    expect(w.engine.current).toBe('a');
  });

  it('re-focuses the nearest neighbour when the focused element is removed', () => {
    const w = world();
    grid(w);
    const extra = w.add('e', { x: 240, y: 0 });
    w.engine.focus('e');
    extra.remove();
    expect(w.engine.current).toBe('b');
    const seen: (string | null)[] = [];
    w.engine.subscribe(() => seen.push(w.engine.current));
    w.engine.focus('a');
    w.add('lonely', { x: 0, y: 0 }, 'solo').remove();
    expect(w.engine.current).toBe('a');
    expect(seen).toEqual(['a']);
  });

  it('clears focus when the last element of the layer is removed, notifying once', () => {
    const w = world();
    const only = w.add('only', { x: 0, y: 0 });
    const listener = vi.fn();
    const unsubscribe = w.engine.subscribe(listener);
    w.engine.focus('only');
    only.remove();
    expect(w.engine.current).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    w.add('again', { x: 0, y: 0 });
    w.engine.focus('again');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('recovers inside the removed element’s own scope before the wider layer', () => {
    const w = world();
    w.add('bg', { x: 0, y: 0 });
    w.engine.pushScope({ id: 'screen' });
    w.add('m1', { x: 0, y: 300 }, 'modal');
    const m2 = w.add('m2', { x: 120, y: 300 }, 'modal');
    w.engine.pushScope({ id: 'modal', parent: 'screen' });
    w.engine.focus('m2');
    m2.remove();
    expect(w.engine.current).toBe('m1');
  });

  it('adopts native focus (tap, click, screen reader) without re-focusing', () => {
    const w = world();
    grid(w);
    const listener = vi.fn();
    w.engine.subscribe(listener);
    w.engine.syncFromDom('b');
    expect(w.engine.current).toBe('b');
    w.engine.syncFromDom('b');
    w.engine.syncFromDom('ghost');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(scroll).not.toHaveBeenCalled();
  });

  it('activate clicks the focused element', () => {
    const w = world();
    const { el } = w.add('btn', { x: 0, y: 0 });
    const onClick = vi.fn();
    el.addEventListener('click', onClick);
    expect(w.engine.activate()).toBe(false);
    w.engine.focus('btn');
    expect(w.engine.activate()).toBe(true);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('moving while focus sits behind a modal jumps into the modal', () => {
    const w = world();
    grid(w);
    w.engine.pushScope({ id: 'screen' });
    w.add('m', { x: 500, y: 500 }, 'modal');
    w.engine.pushScope({ id: 'modal', parent: 'screen', trap: true, autoFocus: false });
    expect(w.engine.current).toBe('a');
    expect(w.engine.activate()).toBe(false);
    expect(w.engine.move('DOWN')).toBe(true);
    expect(w.engine.current).toBe('m');
  });

  it('tolerates environments without scrollIntoView', () => {
    const w = world();
    const { el } = w.add('a', { x: 0, y: 0 });
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    expect(() => w.engine.focus('a')).not.toThrow();
    expect(document.activeElement).toBe(el);
    place(el, { x: 0, y: 0 });
  });

  it('a defer that runs later still settles correctly', async () => {
    const engine = new FocusEngine();
    const root = document.createElement('div');
    document.body.appendChild(root);
    const a = node(root, 'a', { x: 0, y: 0 });
    const b = node(root, 'b', { x: 120, y: 0 });
    const removeA = engine.register('a', 'screen', a);
    engine.register('b', 'screen', b);
    engine.focus('a');
    removeA();
    expect(engine.current).toBe('a');
    await Promise.resolve();
    expect(engine.current).toBe('b');
  });
});

describe('FocusEngine: closing a modal returns to its opener', () => {
  /** A world whose recovery work is queued, so a test can replay the DOM-commit orderings. */
  function deferredWorld(): { engine: FocusEngine; root: HTMLElement; flush(): void } {
    const queue: (() => void)[] = [];
    const engine = new FocusEngine((work) => void queue.push(work));
    const root = document.createElement('div');
    document.body.appendChild(root);
    return {
      engine,
      root,
      flush: () => {
        while (queue.length > 0) queue.shift()?.();
      },
    };
  }

  /** Opener `row` top-left, a decoy `gear` top-right, and a modal button placed right over the gear. */
  function stage(w: ReturnType<typeof deferredWorld>): {
    closeModal(order: 'nodes-first' | 'scope-first'): void;
  } {
    Element.prototype.scrollIntoView = vi.fn();
    const popScreen = w.engine.pushScope({ id: 'screen', parent: null });
    w.engine.register('row', 'screen', node(w.root, 'row', { x: 0, y: 0 }));
    w.engine.register('gear', 'screen', node(w.root, 'gear', { x: 1000, y: 0 }));
    w.engine.focus('row');
    const popModal = w.engine.pushScope({ id: 'modal', parent: 'screen', trap: true, autoFocus: 'first' });
    const unregister = w.engine.register('ok', 'modal', node(w.root, 'ok', { x: 1000, y: 10 }));
    w.engine.focus('ok');
    expect(w.engine.current).toBe('ok');
    void popScreen;
    return {
      closeModal(order) {
        if (order === 'nodes-first') {
          unregister();
          w.flush();
          popModal();
        } else {
          popModal();
          unregister();
        }
        w.flush();
      },
    };
  }

  it('restores the opener when the modal nodes unregister before the scope pops (ref cleanup first)', () => {
    const w = deferredWorld();
    stage(w).closeModal('nodes-first');
    expect(w.engine.current).toBe('row');
  });

  it('restores the opener when the scope pops before its nodes unregister', () => {
    const w = deferredWorld();
    stage(w).closeModal('scope-first');
    expect(w.engine.current).toBe('row');
  });

  it('falls back to the first of the layer when the opener and the memory are gone; a vanished node inside a live scope still recovers by geometry', () => {
    const w = deferredWorld();
    w.engine.pushScope({ id: 'screen', parent: null });
    const dropRow = w.engine.register('row', 'screen', node(w.root, 'row', { x: 0, y: 0 }));
    w.engine.register('gear', 'screen', node(w.root, 'gear', { x: 1000, y: 0 }));
    w.engine.register('row2', 'screen', node(w.root, 'row2', { x: 0, y: 120 }));
    w.engine.focus('row');
    const popModal = w.engine.pushScope({ id: 'modal', parent: 'screen', trap: true, autoFocus: 'first' });
    const dropA = w.engine.register('a', 'modal', node(w.root, 'a', { x: 1000, y: 10 }));
    w.engine.register('b', 'modal', node(w.root, 'b', { x: 1000, y: 130 }));
    w.engine.focus('a');
    dropA();
    w.flush();
    expect(w.engine.current).toBe('b');
    dropRow();
    w.flush();
    expect(w.engine.current).toBe('b');
    popModal();
    w.flush();
    expect(w.engine.current).toBe('gear');
  });
});
