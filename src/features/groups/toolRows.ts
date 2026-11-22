/**
 * One row of a settings-style tool pane (the subset of Android `SettingsRow`
 * the group tools and the Channel-options pane render): toggle, value/choice,
 * plain action, and the blue note. `locked` renders dimmed and unfocusable.
 */
export type ToolRow =
  | { kind: 'toggle'; id: string; title: string; checked: boolean; summary?: string | null }
  | { kind: 'value'; id: string; title: string; summary?: string | null; selected?: boolean }
  | { kind: 'action'; id: string; title: string; locked?: boolean }
  | { kind: 'note'; id: string; text: string };

export function note(text: string): ToolRow {
  return { kind: 'note', id: `note:${text}`, text };
}

export function action(id: string, title: string, locked = false): ToolRow {
  return { kind: 'action', id, title, locked };
}

export function toggle(id: string, title: string, checked: boolean): ToolRow {
  return { kind: 'toggle', id, title, checked };
}

export function value(id: string, title: string, summary: string | null = null, selected = false): ToolRow {
  return { kind: 'value', id, title, summary, selected };
}

/** Whether D-pad focus may land on the row (notes and locked rows are skipped). */
export function activatable(row: ToolRow): boolean {
  if (row.kind === 'note') return false;
  return row.kind !== 'action' || row.locked !== true;
}

/** The row initial focus starts on: the first activatable one. */
export function firstFocusId(rows: readonly ToolRow[]): string | null {
  return rows.find(activatable)?.id ?? null;
}
