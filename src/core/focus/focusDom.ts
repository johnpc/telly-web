// The few DOM touches the focus engine makes, kept apart so the engine reads as a state machine.
import type { Direction } from '../input/remoteKeys';

/** `data-focus-up="id"` etc. override the geometric choice for one direction. */
const OVERRIDE_ATTR: Readonly<Record<Direction, string>> = {
  UP: 'focusUp',
  DOWN: 'focusDown',
  LEFT: 'focusLeft',
  RIGHT: 'focusRight',
};

export function overrideTarget(element: HTMLElement, direction: Direction): string | undefined {
  return element.dataset[OVERRIDE_ATTR[direction]];
}

/** DOM-focus `element` and bring it into view (guide rows and lists rely on the scroll). */
export function focusElement(element: HTMLElement): void {
  element.focus({ preventScroll: true });
  if (typeof element.scrollIntoView === 'function') {
    element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}
