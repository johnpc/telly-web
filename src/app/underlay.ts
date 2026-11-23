import { KeyRouter } from '@/core/input/keyRouter';
import type { Route, RouteKind } from '@/core/navigation/routes';

/**
 * Routes that are SHEETS over the screen beneath them: Android draws Settings
 * as a 360 dp right sheet over the live guide (or player), so the web shell
 * keeps the previous route's screen mounted — inert, hidden from assistive
 * tech, deaf to keys — underneath instead of swapping it out.
 */
const SHEET_ROUTES: ReadonlySet<RouteKind> = new Set<RouteKind>(['Settings']);

/** The route whose screen stays mounted beneath the top one, or null when the top route owns the whole screen. */
export function underlayOf(stack: readonly Route[]): Route | null {
  const top = stack[stack.length - 1];
  const beneath = stack[stack.length - 2];
  if (top === undefined || beneath === undefined || !SHEET_ROUTES.has(top.kind)) return null;
  return beneath;
}

/** A key router nothing dispatches into: the underlay's handlers register here and never see a key. */
export function mutedKeyRouter(): KeyRouter {
  return new KeyRouter({ moveFocus: () => false, activate: () => false, back: () => undefined });
}

export interface StackLayers {
  /** The route on screen (owns `data-route`, keys and focus). */
  top: Route;
  /** The screen rendered at the bottom: the top route, or the one a sheet route sits over. */
  base: Route;
  /** True when `base` is an inert underlay beneath `top`. */
  inert: boolean;
}

/** The two layers the shell renders for a route stack. */
export function stackLayers(stack: readonly Route[]): StackLayers {
  const top = stack[stack.length - 1] ?? { kind: 'Boot' };
  const underlay = underlayOf(stack);
  return { top, base: underlay ?? top, inert: underlay !== null };
}
