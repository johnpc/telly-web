import type { Setting } from '@/core/settings/setting';
import type { SettingsRepository } from '@/core/settings/settingsRepository';

/** A single-choice picker: label list over one raw stored value. */
export interface PickerSpec {
  rowId: string;
  title: string;
  /** The raw settings key the choice is written to. */
  key: string;
  /** The encoded default, highlighted while nothing is stored. */
  defaultRaw: string;
  options: readonly PickerOption[];
}

export interface PickerOption {
  label: string;
  raw: string;
}

/** Options whose label IS the stored raw value. */
export function sameRaw(labels: readonly string[]): PickerOption[] {
  return labels.map((label) => ({ label, raw: label }));
}

/** Numeric options stored as their decimal string; `label` renders them. */
export function numbered(values: readonly number[], label: (n: number) => string = String): PickerOption[] {
  return values.map((n) => ({ label: label(n), raw: String(n) }));
}

export function pickerOf<T>(
  rowId: string,
  title: string,
  setting: Setting<T>,
  options: readonly PickerOption[],
): PickerSpec {
  return { rowId, title, key: setting.key, defaultRaw: setting.encode(setting.default), options };
}

/** The raw value a picker should highlight given the store. */
export function currentRaw(spec: PickerSpec, settings: SettingsRepository): string {
  return settings.snapshot()[spec.key] ?? spec.defaultRaw;
}

/** "None" for 0, per the captured default of both interval pickers. */
export function intervalLabel(hours: number): string {
  return hours === 0 ? 'None' : String(hours);
}
