import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { SEARCH_IDS, historyRowId } from './searchIds';
import { SectionHeader } from './SearchWidgetsScreen';

export const SEARCH_HISTORY_HEADER = 'Search history';
export const SEARCH_NO_HISTORY = 'No history';

interface SearchHistoryProps {
  entries: readonly string[];
  onEntry(entry: string): void;
  onClear(): void;
}

/**
 * The idle landing pane (capture 49): "Search history" header aligned with the
 * query bar, trash icon at the bar's right edge, then either the entry rows or
 * a centered "No history".
 */
export function SearchHistoryScreen({ entries, onEntry, onClear }: SearchHistoryProps): JSX.Element {
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="search-history">
      <div className="flex w-full items-center pt-[4rem] pl-[24rem] md:w-[99rem]">
        <SectionHeader text={SEARCH_HISTORY_HEADER} className="flex-1" />
        <Focusable
          focusId={SEARCH_IDS.trash}
          as="button"
          aria-label="Clear search history"
          onClick={onClear}
          className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full text-telly-text"
          focusedClassName="bg-telly-focus-fill !text-telly-focus-text"
        >
          <svg viewBox="0 0 24 24" className="h-[2.25rem] w-[2.25rem]" fill="currentColor" aria-hidden="true">
            <path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </svg>
        </Focusable>
      </div>
      {entries.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-[2.25rem] text-telly-text-muted">
          {SEARCH_NO_HISTORY}
        </div>
      ) : (
        <ul className="mt-[1rem] pl-[24rem]">
          {entries.map((entry, index) => (
            <Focusable
              key={entry}
              as="li"
              focusId={historyRowId(index)}
              onClick={() => onEntry(entry)}
              className="flex h-[5rem] w-full items-center rounded-[0.5rem] px-[1.5rem] text-[2rem] md:w-[75rem]"
              focusedClassName="bg-telly-focus-fill focused:text-telly-focus-text"
            >
              {entry}
            </Focusable>
          ))}
        </ul>
      )}
    </div>
  );
}
