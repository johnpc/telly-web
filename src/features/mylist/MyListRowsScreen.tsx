import type { JSX } from 'react';
import { displayName } from '@/core/db/types';
import { Focusable } from '@/core/focus/Focusable';
import { LogoTile } from '@/features/search/SearchWidgetsScreen';
import { type MyListScreenRow, myListRowId } from './myListRows';

interface MyListRowsProps {
  rows: readonly MyListScreenRow[];
  onRow(row: MyListScreenRow): void;
}

/** The saved programmes, newest first. */
export function MyListRowsScreen({ rows, onRow }: MyListRowsProps): JSX.Element {
  return (
    <ul className="absolute inset-x-[5rem] top-[10rem] bottom-[5.5rem] overflow-y-auto">
      {rows.map((row) => (
        <MyListRowScreen key={myListRowId(row)} row={row} onClick={() => onRow(row)} />
      ))}
    </ul>
  );
}

/** One saved programme in the 39 dp channel-row idiom: logo + name, title (accent while airing), air time. */
function MyListRowScreen({ row, onClick }: { row: MyListScreenRow; onClick(): void }): JSX.Element {
  return (
    <Focusable
      as="li"
      focusId={myListRowId(row)}
      onClick={onClick}
      data-testid="mylist-row"
      className="flex h-[4.875rem] items-center gap-[1.5rem] rounded-[0.5rem] px-[1rem]"
      focusedClassName="bg-telly-focus-fill text-telly-focus-text"
    >
      <LogoTile
        logoUrl={row.channel.logoUrl}
        name={displayName(row.channel)}
        className="h-[3rem] w-[3rem] text-[0.875rem]"
      />
      <span data-testid="mylist-channel" className="w-[20rem] truncate text-[1.75rem]">
        {displayName(row.channel)}
      </span>
      <span
        data-testid="mylist-title"
        className={`flex-1 truncate text-[1.875rem] ${row.airing ? 'text-telly-playback-accent' : ''}`}
      >
        {row.entry.title}
      </span>
      <span className="text-[1.625rem] text-telly-text-muted">{row.airTimeText}</span>
    </Focusable>
  );
}
