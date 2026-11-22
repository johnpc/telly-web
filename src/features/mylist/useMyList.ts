// The My List screen's state (port of Android `MyListViewModel`): saved
// programmes newest-first with ended entries auto-hidden, plus per-entry removal.
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback } from 'react';
import { type ChannelRepository, channelRepository } from '@/core/db/channelRepository';
import { type MyListRepository, myListRepository } from '@/core/db/myListRepository';
import { type MyListScreenRow, myListRows } from './myListRows';

export interface MyListDeps {
  myList: MyListRepository;
  channels: ChannelRepository;
  clock: () => number;
}

export const defaultMyListDeps: MyListDeps = {
  myList: myListRepository,
  channels: channelRepository,
  clock: () => Date.now(),
};

export interface MyListModel {
  /** undefined until the first read resolves. */
  rows: MyListScreenRow[] | undefined;
  remove(row: MyListScreenRow): Promise<void>;
}

export function useMyList(deps: MyListDeps = defaultMyListDeps): MyListModel {
  const rows = useLiveQuery(
    async () => myListRows(await deps.myList.all(), await deps.channels.visible(), deps.clock()),
    [deps],
  );
  const remove = useCallback(
    (row: MyListScreenRow) => deps.myList.remove(row.entry.channelKey, row.entry.startMs),
    [deps],
  );
  return { rows, remove };
}
