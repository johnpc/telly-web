import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { rowFocusId } from './focusMemory';
import { type InteractiveRow, isLocked, type SettingsRow } from './settingsRow';
import { RowIcon, RowSpinner, RowSwitch, SelectedCheck } from './SettingsRowPartsScreen';

interface RowProps {
  row: InteractiveRow;
  onActivate: (rowId: string) => void;
  /** Transparent resting fill (GuidedStep action pills); the sheet's rows rest on the pane colour. */
  transparent?: boolean;
}

function summaryOf(row: InteractiveRow): string | undefined {
  return row.kind === 'Action' ? undefined : row.summary;
}

function Trailing({ row, locked }: { row: InteractiveRow; locked: boolean }): JSX.Element | null {
  if (row.kind === 'Toggle') return <RowSwitch checked={row.checked} locked={locked} />;
  if (row.kind === 'Action' && row.busy === true) return <RowSpinner />;
  if (row.kind === 'Value' && row.selected === true) return <SelectedCheck />;
  return null;
}

function Body({
  row,
  focused,
  locked,
}: {
  row: InteractiveRow;
  focused: boolean;
  locked: boolean;
}): JSX.Element {
  const summary = summaryOf(row);
  const summaryColor = locked
    ? 'text-telly-text-disabled'
    : focused
      ? 'text-telly-text-faint-focused'
      : 'text-telly-text-guidance-muted';
  const check = row.kind === 'Value' && row.checkIcon === true;
  return (
    <>
      {locked ? (
        <RowIcon kind="lock" focused={focused} />
      ) : check ? (
        <RowIcon kind="check" focused={focused} />
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-1 py-6">
        <span className={`text-[1.75rem] leading-[2.375rem] ${locked ? 'text-telly-text-disabled' : ''}`}>
          {row.title}
        </span>
        {summary !== undefined && (
          <span className={`truncate text-[1.5rem] leading-8 ${summaryColor}`}>{summary}</span>
        )}
      </span>
      <Trailing row={row} locked={locked} />
    </>
  );
}

const ROW_CLASS = 'mx-4 flex min-h-[5.625rem] items-center rounded-lg px-8 font-condensed';

/** One interactive settings row: focus pill, optional icon/summary/widget (Android `SettingsScreenRow`). */
export function SettingsRowScreen({ row, onActivate, transparent = false }: RowProps): JSX.Element {
  const locked = isLocked(row);
  const resting = transparent ? 'bg-transparent' : 'bg-telly-guidance-pane';
  if (locked) {
    return (
      <div
        className={`${ROW_CLASS} ${resting} text-telly-text-disabled`}
        data-row-id={row.id}
        aria-disabled="true"
      >
        <Body row={row} focused={false} locked />
      </div>
    );
  }
  return (
    <Focusable
      focusId={rowFocusId(row.id)}
      role={row.kind === 'Toggle' ? 'switch' : 'button'}
      aria-checked={row.kind === 'Toggle' ? row.checked : undefined}
      data-row-id={row.id}
      onClick={() => onActivate(row.id)}
      className={`${ROW_CLASS} ${resting} text-telly-text`}
      focusedClassName="bg-telly-settings-focus-fill text-telly-focus-text"
    >
      {(focused) => <Body row={row} focused={focused} locked={false} />}
    </Focusable>
  );
}

/** Blue group headers + the footer notes (non-focusable). */
export function SettingsStaticRowScreen({ row }: { row: SettingsRow }): JSX.Element | null {
  if (row.kind === 'Header') {
    return (
      <p className="px-12 pb-4 pt-9 text-[1.5rem] text-telly-playback-accent font-condensed">{row.text}</p>
    );
  }
  if (row.kind !== 'Note') return null;
  const color = row.accent ? 'text-telly-playback-accent' : 'text-telly-text-guidance-muted';
  return <p className={`px-12 pb-6 pt-4 text-[1.5rem] font-condensed ${color}`}>{row.text}</p>;
}
