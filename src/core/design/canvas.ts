/**
 * The dp canvas — the JS mirror of `--dp` in `src/index.css` (keep both in
 * step). Landscape: the 960×540 dp TV reference letterboxed into the viewport
 * (2 px per dp at 1080p). Portrait (phones): a 390 dp-wide canvas, 1 px per
 * dp on a 390 px phone, whose height follows the screen.
 */
export const TV_CANVAS_WIDTH_DP = 960;
export const TV_CANVAS_HEIGHT_DP = 540;
export const PORTRAIT_CANVAS_WIDTH_DP = 390;

export interface CanvasDp {
  widthDp: number;
  heightDp: number;
  /** `(orientation: portrait)`: height ≥ width. */
  portrait: boolean;
}

/** Device pixels per dp for a viewport of `widthPx` × `heightPx`. */
export function dpPx(widthPx: number, heightPx: number): number {
  if (heightPx >= widthPx) return widthPx / PORTRAIT_CANVAS_WIDTH_DP;
  return Math.min(widthPx / TV_CANVAS_WIDTH_DP, heightPx / TV_CANVAS_HEIGHT_DP);
}

/** The viewport in dp, less `insetPx` reserved at the bottom (the soft remote's height). */
export function canvasDp(widthPx: number, heightPx: number, insetPx = 0): CanvasDp {
  const px = dpPx(widthPx, heightPx);
  if (!(px > 0)) return { widthDp: TV_CANVAS_WIDTH_DP, heightDp: TV_CANVAS_HEIGHT_DP, portrait: false };
  return {
    widthDp: Math.floor(widthPx / px),
    heightDp: Math.floor(Math.max(0, heightPx - insetPx) / px),
    portrait: heightPx >= widthPx,
  };
}
