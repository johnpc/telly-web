// Pure "where should focus go now?" policies for the focus engine: on scope
// mount (auto-focus), when the focused node vanishes, and when a scope pops.
// They only read the registry and return an id (or null); the engine acts.
import type { Direction } from '../input/remoteKeys';
import { overrideTarget } from './focusDom';
import type { AutoFocus, FocusEntry, FocusRegistry } from './focusRegistry';
import { isVisibleRect, nearestByCenter, pickInDirection, type Candidate, type Rect } from './spatial';

export interface RecoveryView {
  registry: FocusRegistry;
  remembered: ReadonlyMap<string, string>;
  lastRect: Rect | null;
}

export function toCandidate(entry: FocusEntry): Candidate {
  return { id: entry.id, rect: entry.element.getBoundingClientRect() };
}

function visibleCandidates(entries: readonly FocusEntry[]): Candidate[] {
  return entries.map(toCandidate).filter((candidate) => isVisibleRect(candidate.rect));
}

/** Arrow from `from`: an explicit `data-focus-*` override wins, else the geometric best in the active layer. */
export function moveTarget(view: RecoveryView, from: FocusEntry, direction: Direction): string | null {
  const override = overrideTarget(from.element, direction);
  if (override !== undefined && view.registry.get(override) !== undefined) return override;
  const others = view.registry.activeEntries().filter((entry) => entry.id !== from.id);
  return pickInDirection(from.element.getBoundingClientRect(), direction, visibleCandidates(others));
}

function firstUnder(view: RecoveryView, scope: string): string | null {
  return view.registry.entriesUnder(scope)[0]?.id ?? null;
}

/** Scope mounted: 'first' always; 'remembered' only when focus is not already in the active layer. */
export function autoFocusTarget(
  view: RecoveryView,
  scope: string,
  mode: AutoFocus,
  focusIsValid: boolean,
): string | null {
  if (mode === false || (mode === 'remembered' && focusIsValid)) return null;
  const remembered = mode === 'remembered' ? view.remembered.get(scope) : undefined;
  if (remembered !== undefined && view.registry.get(remembered) !== undefined) return remembered;
  return firstUnder(view, scope);
}

/**
 * Focused node vanished: nearest neighbour (by centre) among what is left of its
 * scope. A scope with nothing left is unmounting (a modal closing: its nodes
 * unregister before its scope pops), so it is treated exactly like a pop —
 * never a geometric guess over the layer beneath.
 */
export function recoveryTarget(view: RecoveryView, scope: string): string | null {
  const inScope = view.registry.entriesUnder(scope);
  if (inScope.length === 0) return poppedTarget(view, scope);
  if (view.lastRect === null) return inScope[0]?.id ?? null;
  return nearestByCenter(view.lastRect, inScope.map(toCandidate));
}

/** The node focused when `scope` was pushed, if it is still registered. */
function openerOf(view: RecoveryView, scope: string): string | null {
  const id = view.registry.openerOf(scope);
  return id !== null && view.registry.get(id) !== undefined ? id : null;
}

/** `scope` popped: back to its opener, else what the newest remaining scope remembers. */
export function poppedTarget(view: RecoveryView, scope: string): string | null {
  return openerOf(view, scope) ?? rememberedTarget(view);
}

/** The element `scope` remembers, if it is still registered and reachable by arrows. */
function reachableMemory(view: RecoveryView, scope: string): string | null {
  const id = view.remembered.get(scope);
  const entry = id === undefined ? undefined : view.registry.get(id);
  return entry !== undefined && view.registry.isActive(entry.scope) ? entry.id : null;
}

/** A scope popped: what the newest remaining scope remembers (if still reachable), else first of the layer. */
export function rememberedTarget(view: RecoveryView): string | null {
  for (const scope of view.registry.scopesTopDown()) {
    const id = reachableMemory(view, scope);
    if (id !== null) return id;
  }
  return view.registry.activeEntries()[0]?.id ?? null;
}
