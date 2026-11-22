import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { useNavigator } from '@/core/navigation/useNavigator';
import { useFocusAnchor } from '@/features/search/focusAnchor';
import {
  MY_LIST_EMPTY,
  MY_LIST_REMOVE_HINT,
  MY_LIST_TITLE,
  type MyListScreenRow,
  NO_INFORMATION,
} from './myListRows';
import { MyListRowsScreen } from './MyListRowsScreen';
import { type MyListDeps, defaultMyListDeps, useMyList } from './useMyList';
import { useMyListActions } from './useMyListActions';

/**
 * The My List screen behind the guide rail's bookmark icon (Route.MyList):
 * saved programmes newest-first, OK on an airing entry tunes its channel, OK
 * on a future entry shows its description, long-OK removes an entry, ended
 * entries auto-hide. Layout follows telly's History-screen idiom on the flat
 * app background (no captures exist — premium-locked in the reference).
 */
export function MyListScreen({ deps = defaultMyListDeps }: { deps?: MyListDeps }): JSX.Element {
  const navigator = useNavigator();
  const model = useMyList(deps);
  const actions = useMyListActions(model);
  const restoreFocus = useFocusAnchor(actions.described !== null);
  const closeDescription = (): void => {
    actions.closeDescription();
    restoreFocus();
  };
  return (
    <FocusScope id="mylist" onBack={() => navigator.pop()}>
      <div
        className="relative h-full w-full bg-telly-onboarding-bg text-telly-text"
        data-testid="mylist-screen"
      >
        <MyListChromeScreen hasRows={(model.rows?.length ?? 0) > 0} />
        <MyListBodyScreen rows={model.rows} onRow={actions.onRow} />
        {actions.described !== null && (
          <MyListDescriptionScreen row={actions.described} onClose={closeDescription} />
        )}
      </div>
    </FocusScope>
  );
}

/** Title top-right, the remove hint bottom-left while rows exist (the History-screen idiom). */
function MyListChromeScreen({ hasRows }: { hasRows: boolean }): JSX.Element {
  return (
    <>
      <h1 className="absolute top-[2.5rem] right-[3rem] text-[3.5rem]">{MY_LIST_TITLE}</h1>
      {hasRows && (
        <div className="absolute bottom-[2rem] left-[5rem] text-[1.625rem] text-telly-text-muted">
          {MY_LIST_REMOVE_HINT}
        </div>
      )}
    </>
  );
}

/** Nothing until the first read; "No programs" when empty; else the rows. */
function MyListBodyScreen({
  rows,
  onRow,
}: {
  rows: MyListScreenRow[] | undefined;
  onRow(row: MyListScreenRow): void;
}): JSX.Element | null {
  if (rows === undefined) return null;
  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[2.25rem] text-telly-text-muted">
        {MY_LIST_EMPTY}
      </div>
    );
  }
  return <MyListRowsScreen rows={rows} onRow={onRow} />;
}

/** OK on a future entry: full-screen title + synopsis ("No information" when the EPG has none); BACK closes. */
function MyListDescriptionScreen({ row, onClose }: { row: MyListScreenRow; onClose(): void }): JSX.Element {
  return (
    <FocusScope id="mylist-description" trap onBack={onClose}>
      <div
        data-testid="mylist-description"
        className="absolute inset-0 flex flex-col items-center justify-center bg-telly-onboarding-bg px-[10rem] text-center"
      >
        <div className="text-[2.5rem] text-telly-text">{row.entry.title}</div>
        <div className="mt-[1rem] text-[2.25rem] text-telly-text-muted">
          {row.entry.description ?? NO_INFORMATION}
        </div>
      </div>
    </FocusScope>
  );
}
