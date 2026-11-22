/**
 * One row of a settings pane, matching the captured TiviMate row types:
 * toggle, value/choice (opens a picker), plain action, blue group header,
 * and the note (port of Android `SettingsRow.kt`). `locked` renders the
 * dimmed, unfocusable treatment the reference uses for premium rows — telly
 * only uses it for rows the web platform cannot honor.
 */
export interface ToggleRow {
  kind: 'Toggle';
  id: string;
  title: string;
  checked: boolean;
  summary?: string;
  locked?: boolean;
}

export interface ValueRow {
  kind: 'Value';
  id: string;
  title: string;
  summary?: string;
  locked?: boolean;
  /** Trailing accent check on the selected picker option. */
  selected?: boolean;
  /** Leading circle-check (enabled playlist rows, ref/05). */
  checkIcon?: boolean;
}

export interface ActionRow {
  kind: 'Action';
  id: string;
  title: string;
  locked?: boolean;
  /** In-flight manual refresh: the row renders a trailing spinner. */
  busy?: boolean;
}

export interface HeaderRow {
  kind: 'Header';
  id: string;
  text: string;
}

export interface NoteRow {
  kind: 'Note';
  id: string;
  text: string;
  accent: boolean;
}

export type SettingsRow = ToggleRow | ValueRow | ActionRow | HeaderRow | NoteRow;

export type InteractiveRow = ToggleRow | ValueRow | ActionRow;

export function toggle(id: string, title: string, checked: boolean, summary?: string): ToggleRow {
  return summary === undefined
    ? { kind: 'Toggle', id, title, checked }
    : { kind: 'Toggle', id, title, checked, summary };
}

export function value(id: string, title: string, summary?: string, extra: Partial<ValueRow> = {}): ValueRow {
  const base: ValueRow = { kind: 'Value', id, title, ...extra };
  return summary === undefined ? base : { ...base, summary };
}

export function action(id: string, title: string): ActionRow {
  return { kind: 'Action', id, title };
}

export function header(text: string): HeaderRow {
  return { kind: 'Header', id: `header:${text}`, text };
}

export function note(text: string, accent = true): NoteRow {
  return { kind: 'Note', id: `note:${text}`, text, accent };
}

export function isInteractive(row: SettingsRow): row is InteractiveRow {
  return row.kind === 'Toggle' || row.kind === 'Value' || row.kind === 'Action';
}

export function isLocked(row: SettingsRow): boolean {
  return isInteractive(row) && row.locked === true;
}

/** "Not set" is the captured placeholder for blank value rows. */
export function notSet(raw: string): string {
  return raw.trim() === '' ? 'Not set' : raw;
}

/** The row a fresh sheet should focus: its first focusable row. */
export function firstFocusableId(rows: readonly SettingsRow[]): string | null {
  return rows.find((row) => isInteractive(row) && !isLocked(row))?.id ?? null;
}

/** Marks the in-flight action row so the sheet renders its spinner. */
export function markBusy(rows: readonly SettingsRow[], busyRowId: string | null): SettingsRow[] {
  if (busyRowId === null) return [...rows];
  return rows.map((row) => (row.kind === 'Action' && row.id === busyRowId ? { ...row, busy: true } : row));
}
