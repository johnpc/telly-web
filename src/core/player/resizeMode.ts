// Maps the persisted "Resize mode" raw value (store-only key; captured
// TiviMate default "Fit") onto the `<video>` CSS `object-fit`. Port of
// Android's `ResizeModes`: Media3 has no distinct "stretch" vs "fill" either
// (both are RESIZE_MODE_FILL), so both map to `fill`; unknown values fall
// back to Fit — the previously hardcoded behavior.

export type ResizeMode = 'Fit' | 'Fill' | 'Zoom' | 'Stretch';

export type ObjectFit = 'contain' | 'fill' | 'cover';

const OBJECT_FIT: Readonly<Record<ResizeMode, ObjectFit>> = {
  Fit: 'contain',
  Fill: 'fill',
  Stretch: 'fill',
  Zoom: 'cover',
};

const BY_RAW: Readonly<Record<string, ResizeMode>> = {
  stretch: 'Stretch',
  fill: 'Fill',
  crop: 'Zoom',
  zoom: 'Zoom',
};

/** The persisted setting value → mode; unknown (incl. "fixed width/height") → Fit. */
export function resizeModeOf(raw: string): ResizeMode {
  return BY_RAW[raw.trim().toLowerCase()] ?? 'Fit';
}

export function objectFitOf(mode: ResizeMode): ObjectFit {
  return OBJECT_FIT[mode];
}
