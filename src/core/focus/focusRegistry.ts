// Bookkeeping for the focus engine: which elements exist, which scope each
// belongs to, and the scope stack that decides where arrows may travel.
// Scopes nest (a scope knows its parent); a `trap` scope confines arrows to
// itself and its descendants (modal dialogs).

export interface FocusEntry {
  id: string;
  scope: string;
  element: HTMLElement;
}

export interface ScopeSpec {
  id: string;
  parent: string | null;
  trap: boolean;
}

export type AutoFocus = 'first' | 'remembered' | false;

/** What `FocusScope` passes to `FocusEngine.pushScope`. */
export interface FocusScopeSpec {
  id: string;
  /** Scope this one is nested in (from `FocusScopeContext`); null at the root. */
  parent?: string | null;
  /** Confine arrows to this scope and its descendants (modal). */
  trap?: boolean;
  /** 'first' always focuses the first element; 'remembered' (default) only when focus is not already in the active layer. */
  autoFocus?: AutoFocus;
}

function domOrder(a: FocusEntry, b: FocusEntry): number {
  const following = a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING;
  return following === 0 ? 1 : -1;
}

export class FocusRegistry {
  private readonly entries = new Map<string, FocusEntry>();
  private scopes: ScopeSpec[] = [];

  add(entry: FocusEntry): void {
    this.entries.set(entry.id, entry);
  }

  remove(id: string): void {
    this.entries.delete(id);
  }

  get(id: string): FocusEntry | undefined {
    return this.entries.get(id);
  }

  pushScope(spec: ScopeSpec): void {
    this.scopes = [...this.scopes.filter((s) => s.id !== spec.id), spec];
  }

  popScope(id: string): void {
    this.scopes = this.scopes.filter((s) => s.id !== id);
  }

  /** Scope ids most recently pushed first. */
  scopesTopDown(): string[] {
    return this.scopes.map((s) => s.id).reverse();
  }

  /** True when `scope` is `ancestor` or nested (transitively) inside it. */
  isWithin(scope: string, ancestor: string): boolean {
    let cursor: string | null = scope;
    while (cursor !== null) {
      if (cursor === ancestor) return true;
      cursor = this.scopes.find((s) => s.id === cursor)?.parent ?? null;
    }
    return false;
  }

  /** The scope arrows are confined to: the most recent trap, or null when nothing traps. */
  activeTrap(): string | null {
    const trap = [...this.scopes].reverse().find((s) => s.trap);
    return trap?.id ?? null;
  }

  /**
   * True when an element in `scope` may receive focus by arrow keys right now:
   * its scope is mounted (on the stack) and inside the trap, if one is active.
   * With no scopes at all, everything is reachable.
   */
  isActive(scope: string): boolean {
    if (this.scopes.length === 0) return true;
    if (!this.scopes.some((s) => s.id === scope)) return false;
    const trap = this.activeTrap();
    return trap === null || this.isWithin(scope, trap);
  }

  /** Every entry reachable by arrows, in DOM order. */
  activeEntries(): FocusEntry[] {
    return this.sorted((entry) => this.isActive(entry.scope));
  }

  /** Every entry in `scope` or a scope nested inside it, in DOM order. */
  entriesUnder(scope: string): FocusEntry[] {
    return this.sorted((entry) => this.isWithin(entry.scope, scope) && this.isActive(entry.scope));
  }

  private sorted(keep: (entry: FocusEntry) => boolean): FocusEntry[] {
    return [...this.entries.values()].filter(keep).sort(domOrder);
  }
}
