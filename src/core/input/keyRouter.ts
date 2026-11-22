// A stack of key handlers. The most recently pushed handler (the overlay on
// top) sees a key first; returning false lets it fall through. Keys nobody
// handles get the built-in behaviour: arrows move focus, OK activates the
// focused element, BACK pops the navigator.
import { isDirection, type Direction, type RemoteKey } from './remoteKeys';

/** Returns true when the key was consumed. */
export type KeyHandler = (key: RemoteKey) => boolean;

export interface KeyRouterFallbacks {
  /** Move focus one step; true when focus moved. */
  moveFocus(direction: Direction): boolean;
  /** Activate (click) the focused element; true when there was one. */
  activate(): boolean;
  /** Nobody handled BACK: pop the navigator (or whatever the host decides). */
  back(): void;
}

export class KeyRouter {
  private readonly handlers: KeyHandler[] = [];

  constructor(private fallbacks: KeyRouterFallbacks) {}

  /** Swap the built-in behaviour (the provider re-points BACK when its `onBack` prop changes). */
  setFallbacks(fallbacks: Partial<KeyRouterFallbacks>): void {
    this.fallbacks = { ...this.fallbacks, ...fallbacks };
  }

  /** Number of handlers on the stack (for tests and debugging). */
  get depth(): number {
    return this.handlers.length;
  }

  /** Pushes a handler on top; the returned function removes it again. */
  push(handler: KeyHandler): () => void {
    this.handlers.push(handler);
    return () => {
      const index = this.handlers.lastIndexOf(handler);
      if (index >= 0) this.handlers.splice(index, 1);
    };
  }

  /** Offers the key top-down, then applies the fallback. True when consumed. */
  dispatch(key: RemoteKey): boolean {
    for (const handler of [...this.handlers].reverse()) {
      if (handler(key)) return true;
    }
    return this.fallback(key);
  }

  private fallback(key: RemoteKey): boolean {
    if (isDirection(key)) return this.fallbacks.moveFocus(key);
    if (key === 'OK') return this.fallbacks.activate();
    if (key !== 'BACK') return false;
    this.fallbacks.back();
    return true;
  }
}
