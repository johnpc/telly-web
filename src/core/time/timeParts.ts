/**
 * Local (or zoned) calendar parts of an instant, read through `Intl` NUMERIC
 * parts and re-assembled by hand so no locale ever slips a narrow no-break
 * space before AM/PM. Node-side acceptance steps import this too, so the
 * strings are byte-identical in the app and in the tests.
 */
export interface TimeParts {
  weekday: string;
  month: string;
  day: string;
  year: number;
  hour: number;
  minute: number;
}

const FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hourCycle: 'h23',
};

const formats = new Map<string, Intl.DateTimeFormat>();

function buildFormat(timeZone: string | undefined): Intl.DateTimeFormat {
  const options = timeZone === undefined ? FORMAT_OPTIONS : { ...FORMAT_OPTIONS, timeZone };
  return new Intl.DateTimeFormat('en-US', options);
}

function formatFor(timeZone: string | undefined): Intl.DateTimeFormat {
  const key = timeZone ?? '';
  const format = formats.get(key) ?? buildFormat(timeZone);
  formats.set(key, format);
  return format;
}

export function partsOf(atMs: number, timeZone?: string): TimeParts {
  const raw = Object.fromEntries(
    formatFor(timeZone)
      .formatToParts(new Date(atMs))
      .map((p) => [p.type, p.value]),
  );
  return {
    weekday: raw['weekday'] ?? '',
    month: raw['month'] ?? '',
    day: raw['day'] ?? '',
    year: Number(raw['year'] ?? 0),
    hour: Number(raw['hour'] ?? 0) % 24,
    minute: Number(raw['minute'] ?? 0),
  };
}

export const pad2 = (n: number): string => String(n).padStart(2, '0');
export const meridiem = (p: TimeParts): string => (p.hour < 12 ? 'AM' : 'PM');
export const hour12 = (p: TimeParts): number => (p.hour % 12 === 0 ? 12 : p.hour % 12);
export const hhmm24 = (p: TimeParts): string => `${pad2(p.hour)}:${pad2(p.minute)}`;
export const hhmm12 = (p: TimeParts): string => `${pad2(hour12(p))}:${pad2(p.minute)}`;
/** "Sun, Sep 13". */
export const dayOf = (p: TimeParts): string => `${p.weekday}, ${p.month} ${p.day}`;
