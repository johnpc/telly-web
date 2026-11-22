// Test helper: lay elements out in jsdom (which has no layout) by stubbing getBoundingClientRect.
export interface Box {
  x: number;
  y: number;
  w?: number;
  h?: number;
}

export function rectOf({ x, y, w = 100, h = 100 }: Box): DOMRect {
  return {
    left: x,
    top: y,
    right: x + w,
    bottom: y + h,
    width: w,
    height: h,
    x,
    y,
    toJSON: () => ({}),
  };
}

export function place(element: HTMLElement, box: Box): HTMLElement {
  element.getBoundingClientRect = () => rectOf(box);
  return element;
}

/** Creates a focusable div, lays it out, and appends it to `parent`. */
export function node(parent: HTMLElement, id: string, box: Box): HTMLElement {
  const el = document.createElement('div');
  el.tabIndex = -1;
  el.dataset.focusId = id;
  parent.appendChild(el);
  return place(el, box);
}
