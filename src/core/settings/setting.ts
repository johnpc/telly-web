/**
 * A typed settings key: storage key, default, and the string codec used by
 * the `KeyValueStore` (port of Android `Setting.kt`). Instances live in
 * `tellySettings.ts`; the encodings match Android so backups interoperate.
 */
export interface Setting<T> {
  readonly key: string;
  readonly default: T;
  readonly encode: (value: T) => string;
  readonly decode: (raw: string) => T;
}

/** Kotlin `toBooleanStrictOrNull`: only the exact words "true"/"false". */
function decodeBoolStrict(raw: string): boolean | null {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return null;
}

/** Kotlin `toIntOrNull`: an optionally signed run of digits, nothing else. */
function decodeIntOrNull(raw: string): number | null {
  if (!/^[+-]?\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

export function boolSetting(key: string, defaultValue: boolean): Setting<boolean> {
  return {
    key,
    default: defaultValue,
    encode: (value) => String(value),
    decode: (raw) => decodeBoolStrict(raw) ?? defaultValue,
  };
}

export function intSetting(key: string, defaultValue: number): Setting<number> {
  return {
    key,
    default: defaultValue,
    encode: (value) => String(value),
    decode: (raw) => decodeIntOrNull(raw) ?? defaultValue,
  };
}

export function stringSetting(key: string, defaultValue: string): Setting<string> {
  return { key, default: defaultValue, encode: (value) => value, decode: (raw) => raw };
}

/** Sets are stored newline-joined; names never contain newlines in practice. */
export function stringSetSetting(key: string): Setting<ReadonlySet<string>> {
  return {
    key,
    default: new Set<string>(),
    encode: (value) => [...value].join('\n'),
    decode: (raw) => new Set(raw.split('\n').filter((line) => line !== '')),
  };
}
