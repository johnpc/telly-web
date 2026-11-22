import type { JSX } from 'react';
import type { SearchProgramHit } from './searchResults';
import { TimesLine } from './SearchWidgetsScreen';

/**
 * The right-side detail card of the focused programme result (captures 50/51):
 * title, air time — with dash progress + remaining minutes while airing — then
 * the description in muted grey. Never takes focus; keeps the results' resting alpha.
 */
export function SearchDetailScreen({ hit }: { hit: SearchProgramHit }): JSX.Element {
  return (
    <aside
      data-testid="search-detail"
      className="mt-[5rem] mr-[3rem] w-[41.5rem] shrink-0 rounded-[1rem] bg-[#212830] p-[2rem] opacity-[0.42]"
    >
      <h3 className="line-clamp-2 text-[2.5rem] leading-tight tracking-normal text-telly-text">
        {hit.title}
      </h3>
      <TimesLine
        range={hit.timeText}
        permille={hit.progressPermille}
        remaining={hit.remaining}
        className="mt-[1rem] text-[1.75rem]"
      />
      {hit.program.description !== null && (
        <p className="mt-[1rem] line-clamp-4 text-[1.75rem] text-telly-text-muted">
          {hit.program.description}
        </p>
      )}
    </aside>
  );
}
