// Spatial-navigation focus engine over real DOM nodes. One focused element at
// a time; arrows pick the geometrically best neighbour inside the active scope
// layer; a trap scope (modal) confines them; each scope remembers its last
// focused element, and every pushed scope records which node opened it, so
// popping a modal lands back on its opener before any geometric recovery.
// @stateMachine('Focus engine')
import type { Direction } from '../input/remoteKeys';
import { focusElement } from './focusDom';
import {
  autoFocusTarget,
  moveTarget,
  poppedTarget,
  recoveryTarget,
  type RecoveryView,
} from './focusRecovery';
import { FocusRegistry, type FocusEntry, type FocusScopeSpec } from './focusRegistry';
import type { Rect } from './spatial';

export type { AutoFocus, FocusScopeSpec } from './focusRegistry';

export class FocusEngine {
  private readonly registry = new FocusRegistry();
  private readonly remembered = new Map<string, string>();
  private readonly listeners = new Set<() => void>();
  private focusedId: string | null = null;
  private lastRect: Rect | null = null;

  /** `defer` runs focus recovery after the current DOM commit (microtask by default). */
  constructor(private readonly defer: (work: () => void) => void = (work) => queueMicrotask(work)) {}

  /** The focused element's id, or null. */
  get current(): string | null {
    return this.focusedId;
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Registers a focusable element; the returned function unregisters it. */
  register(id: string, scope: string, element: HTMLElement): () => void {
    this.registry.add({ id, scope, element });
    return () => {
      this.registry.remove(id);
      if (this.focusedId === id) this.defer(() => this.settle(() => recoveryTarget(this.view(), scope)));
    };
  }

  /** Pushes a scope on the stack; the returned function pops it and restores focus beneath. */
  pushScope(spec: FocusScopeSpec): () => void {
    const { id, parent = null, trap = false } = spec;
    this.registry.pushScope({ id, parent, trap, opener: this.focusedId });
    const mode = spec.autoFocus ?? 'remembered';
    const target = autoFocusTarget(this.view(), spec.id, mode, this.activeFocused() !== undefined);
    if (target !== null) this.focus(target);
    return () => {
      this.registry.popScope(spec.id);
      this.defer(() => this.settle(() => poppedTarget(this.view(), spec.id)));
    };
  }

  /** Focuses `id` (DOM focus + scroll into view). False when it is not registered. */
  focus(id: string): boolean {
    const entry = this.registry.get(id);
    if (entry === undefined) return false;
    this.setFocused(entry);
    focusElement(entry.element);
    return true;
  }

  /** The browser focused `id` itself (tap, click, screen reader): adopt it without re-focusing. */
  syncFromDom(id: string): void {
    const entry = this.registry.get(id);
    if (entry !== undefined && this.focusedId !== id) this.setFocused(entry);
  }

  /** Focuses the first element (DOM order) under `scope`, or of the active layer. */
  focusFirst(scope?: string): boolean {
    const entries = scope === undefined ? this.registry.activeEntries() : this.registry.entriesUnder(scope);
    const first = entries[0];
    return first !== undefined && this.focus(first.id);
  }

  /** Moves focus one step; false when nothing lies that way (no wrap-around). */
  move(direction: Direction): boolean {
    const from = this.activeFocused();
    if (from === undefined) return this.focusFirst();
    const target = moveTarget(this.view(), from, direction);
    return target !== null && this.focus(target);
  }

  /** OK: clicks the focused element so a plain `onClick` serves remote, pointer and touch alike. */
  activate(): boolean {
    const entry = this.activeFocused();
    if (entry === undefined) return false;
    entry.element.click();
    return true;
  }

  private view(): RecoveryView {
    return {
      registry: this.registry,
      remembered: this.remembered,
      lastRect: this.lastRect,
    };
  }

  /** The focused entry, provided it is registered and inside the active layer. */
  private activeFocused(): FocusEntry | undefined {
    const entry = this.focusedId === null ? undefined : this.registry.get(this.focusedId);
    return entry !== undefined && this.registry.isActive(entry.scope) ? entry : undefined;
  }

  private setFocused(entry: FocusEntry): void {
    this.focusedId = entry.id;
    this.lastRect = entry.element.getBoundingClientRect();
    this.remembered.set(entry.scope, entry.id);
    this.listeners.forEach((listener) => listener());
  }

  /** Deferred recovery: keep a still-valid focus, else focus `pick()`'s choice, else clear. */
  private settle(pick: () => string | null): void {
    if (this.activeFocused() !== undefined) return;
    const target = pick();
    if (target !== null && this.focus(target)) return;
    if (this.focusedId === null) return;
    this.focusedId = null;
    this.listeners.forEach((listener) => listener());
  }
}

/** The app-wide engine; the DOM is a singleton, so is this. Tests build their own. */
export const focusEngine = new FocusEngine();
