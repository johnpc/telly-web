import type { JSX, ReactNode } from 'react';
import { rowFocusId, useSheetFocus } from './focusMemory';
import { firstFocusableId, isInteractive, isLocked, type SettingsRow } from './settingsRow';
import { SettingsRowScreen, SettingsStaticRowScreen } from './SettingsRowScreen';

/**
 * Dimming scrim + the 360 dp right sheet every settings surface uses (header
 * strip #333639, pane #232629). The test id is the e2e harness's shell
 * sentinel: present for EVERY pane at any depth.
 */
export function SettingsSheetFrameScreen({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="absolute inset-0 flex justify-end bg-black/60">
      <section
        className="flex h-full w-full flex-col bg-telly-guidance-pane sm:w-[45rem]"
        data-testid="settings-sheet"
        aria-label={title}
      >
        <header className="flex h-[9rem] shrink-0 items-center bg-telly-settings-header px-12">
          <h1 className="text-[2.5rem] font-medium text-telly-text">{title}</h1>
        </header>
        <div className="flex-1 overflow-y-auto py-6">{children}</div>
      </section>
    </div>
  );
}

interface RowsProps {
  rows: readonly SettingsRow[];
  onActivate: (rowId: string) => void;
}

/** The focusable rows of a sheet, with headers/notes rendered statically. */
export function SettingsRowsScreen({ rows, onActivate }: RowsProps): JSX.Element {
  return (
    <ul className="m-0 list-none p-0">
      {rows.map((row) => (
        <li key={row.id}>
          {isInteractive(row) ? (
            <SettingsRowScreen row={row} onActivate={onActivate} />
          ) : (
            <SettingsStaticRowScreen row={row} />
          )}
        </li>
      ))}
    </ul>
  );
}

interface SheetProps extends RowsProps {
  title: string;
  paneKey: string;
  focusMemory: Map<string, string>;
}

/** One pane of the sheet stack: title + rows, focus landing on the first row or the remembered one. */
export function SettingsSheetScreen({
  title,
  rows,
  paneKey,
  focusMemory,
  onActivate,
}: SheetProps): JSX.Element {
  const present = rows.filter((row) => isInteractive(row) && !isLocked(row)).map((row) => rowFocusId(row.id));
  useSheetFocus(focusMemory, paneKey, firstFocusableId(rows), present);
  return (
    <SettingsSheetFrameScreen title={title}>
      <SettingsRowsScreen rows={rows} onActivate={onActivate} />
    </SettingsSheetFrameScreen>
  );
}
