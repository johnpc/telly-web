import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { useFocusable } from '@/core/focus/useFocusable';
import { SEARCH_IDS } from './searchIds';

export const SEARCH_HINT = 'Speak to search';

interface SearchTopBarProps {
  query: string;
  onQueryChange(text: string): void;
  /** Enter in the bar (the IME search action) commits the query. */
  onCommit(): void;
  downTarget: string | null;
  onVoice(): void;
  onOpenSettings(): void;
}

/**
 * Search top bar (capture 49): the voice orb takes default focus, RIGHT reaches
 * the light-grey query bar, gear at the far right. DOWN from the bar lands on
 * the remembered / first result node via the focus override, never the
 * geometrically nearest one.
 */
export function SearchTopBarScreen(props: SearchTopBarProps): JSX.Element {
  const { ref, props: focusProps } = useFocusable(SEARCH_IDS.query);
  return (
    <div className="flex items-center gap-[8.75rem] pt-[3.25rem] pr-[3rem] pl-[7rem] portrait:gap-[2rem] portrait:pr-[2rem] portrait:pl-[2rem]">
      <Focusable
        focusId={SEARCH_IDS.orb}
        as="button"
        aria-label="Voice search"
        onClick={props.onVoice}
        className="flex h-[6.5rem] w-[6.5rem] shrink-0 items-center justify-center rounded-full bg-telly-focus-fill text-black"
        focusedClassName="!bg-telly-playback-accent !text-white"
      >
        <MicIcon />
      </Focusable>
      <input
        {...focusProps}
        ref={ref}
        type="text"
        value={props.query}
        placeholder={SEARCH_HINT}
        autoComplete="off"
        spellCheck={false}
        data-testid="search-query"
        data-focus-down={props.downTarget ?? undefined}
        onChange={(e) => props.onQueryChange(e.target.value)}
        onClick={props.onCommit}
        className="h-[7rem] min-w-0 shrink basis-[75rem] rounded-[1rem] bg-[#B8BCC0] px-[3rem] text-[2.5rem] text-[#202124] outline-none placeholder:text-[#75797D]"
      />
      <div className="flex-1" />
      <Focusable
        focusId={SEARCH_IDS.gear}
        as="button"
        aria-label="Search settings"
        onClick={props.onOpenSettings}
        className="flex h-[5rem] w-[5rem] shrink-0 items-center justify-center rounded-full text-telly-text"
        focusedClassName="bg-telly-focus-fill !text-telly-focus-text"
      >
        <GearIcon />
      </Focusable>
    </div>
  );
}

function MicIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="h-[3rem] w-[3rem]" fill="currentColor" aria-hidden="true">
      <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />
    </svg>
  );
}

function GearIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="h-[2.75rem] w-[2.75rem]" fill="currentColor" aria-hidden="true">
      <path d="M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.3 7.3 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.65 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.38 1.04.7 1.63.94l.36 2.54c.05.24.26.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.59-.24 1.13-.56 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z" />
    </svg>
  );
}
