import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { dp, sp } from './toolCss';
import { type ToolRow, activatable } from './toolRows';

interface ToolRowsProps {
  rows: readonly ToolRow[];
  focusPrefix: string;
  onActivate: (rowId: string) => void;
}

function Trailing({ row }: { row: ToolRow }): JSX.Element | null {
  if (row.kind === 'toggle') {
    return (
      <span
        className={`ml-auto h-[1em] w-[2em] shrink-0 rounded-full ${row.checked ? 'bg-telly-accent-blue' : 'bg-telly-text-disabled'}`}
        aria-hidden
      />
    );
  }
  if (row.kind === 'value' && row.selected === true)
    return <span className="ml-auto text-telly-accent-blue">✓</span>;
  return null;
}

/** The settings-style row list shared by the tool sheets and the Channel-options pane. */
export function ToolRowsScreen({ rows, focusPrefix, onActivate }: ToolRowsProps): JSX.Element {
  return (
    <ul className="flex flex-col py-[0.25em]" style={{ fontSize: sp(15) }}>
      {rows.map((row) =>
        row.kind === 'note' ? (
          <li
            key={row.id}
            className="px-[1.1em] py-[0.6em] text-telly-accent-blue"
            style={{ fontSize: sp(13) }}
          >
            {row.text}
          </li>
        ) : (
          <Focusable
            key={row.id}
            as="li"
            focusId={`${focusPrefix}${row.id}`}
            className={`mx-[0.5em] flex items-center gap-[0.5em] rounded-[4px] px-[1.1em] ${
              activatable(row) ? 'text-telly-text' : 'text-telly-text-disabled'
            }`}
            style={{ minHeight: dp(48) }}
            focusedClassName="bg-telly-settings-focus-fill text-telly-focus-text"
            tabIndex={activatable(row) ? -1 : undefined}
            aria-disabled={!activatable(row)}
            role={row.kind === 'toggle' ? 'switch' : undefined}
            aria-checked={row.kind === 'toggle' ? row.checked : undefined}
            data-row-id={row.id}
            onClick={() => activatable(row) && onActivate(row.id)}
          >
            <span className="flex min-w-0 flex-1 flex-col py-[0.4em]">
              <span className="truncate">{row.title}</span>
              {'summary' in row && row.summary !== null && row.summary !== undefined && (
                <span className="truncate opacity-70" style={{ fontSize: sp(13) }}>
                  {row.summary}
                </span>
              )}
            </span>
            <Trailing row={row} />
          </Focusable>
        ),
      )}
    </ul>
  );
}
