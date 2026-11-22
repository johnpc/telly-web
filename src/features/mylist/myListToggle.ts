// The My-list toggle behind the guide dropdown's, the search dropdown's and
// the context sheet's "Add to My list" rows (port of Android `MyListMenu` +
// `MyListProgramme` + `MyListKeys`): saving a programme persists it, selecting
// the row again removes it; the label flips via the live key set.
import { useLiveQuery } from 'dexie-react-hooks';
import { keyOf } from '@/core/db/channelIdentity';
import { type MyListRepository, myListRepository } from '@/core/db/myListRepository';
import type { ChannelRow, MyListRow, ProgramRow } from '@/core/db/types';
import { programTitle } from '@/features/epg/nowNext';

export const MY_LIST_ADD_LABEL = 'Add to My list';
export const MY_LIST_REMOVE_LABEL = 'Remove from My list';

/** The programme a My-list toggle acts on, host-agnostic. */
export interface MyListProgramme {
  title: string;
  startMs: number;
  endMs: number;
  description: string | null;
}

export function programmeOf(program: ProgramRow): MyListProgramme {
  return {
    title: programTitle(program),
    startMs: program.startMs,
    endMs: program.endMs,
    description: program.description,
  };
}

/** Identity of a saved programme: refresh-stable channel key + airing start. */
export function myListKeyOf(channelKey: string, startMs: number): string {
  return `${channelKey}|${startMs}`;
}

export function isSavedInMyList(
  keys: ReadonlySet<string>,
  channel: Pick<ChannelRow, 'tvgId' | 'streamUrl' | 'name'>,
  startMs: number | null,
): boolean {
  return startMs !== null && keys.has(myListKeyOf(keyOf(channel), startMs));
}

/** The dropdown/sheet row label, flipped once the programme is saved. */
export function myListLabel(saved: boolean): string {
  return saved ? MY_LIST_REMOVE_LABEL : MY_LIST_ADD_LABEL;
}

export function myListKeysOf(rows: readonly MyListRow[]): ReadonlySet<string> {
  return new Set(rows.map((row) => myListKeyOf(row.channelKey, row.startMs)));
}

/** Saves `programme` on `channel`, or removes it when already saved; resolves to the new saved state. */
export async function toggleMyList(
  channel: ChannelRow,
  programme: MyListProgramme,
  repository: MyListRepository = myListRepository,
  nowMs: number = Date.now(),
): Promise<boolean> {
  const channelKey = keyOf(channel);
  if ((await repository.find(channelKey, programme.startMs)) !== null) {
    await repository.remove(channelKey, programme.startMs);
    return false;
  }
  await repository.upsert({ channelKey, ...programme, addedAtMs: nowMs });
  return true;
}

/** The dropdowns' "Add to My list" for a guide programme row (toggle semantics, like Android). */
export function addToMyList(channel: ChannelRow, program: ProgramRow): Promise<boolean> {
  return toggleMyList(channel, programmeOf(program));
}

/** Saved-programme keys, live — drives the flipped labels. */
export function useMyListKeys(repository: MyListRepository = myListRepository): ReadonlySet<string> {
  return useLiveQuery(async () => myListKeysOf(await repository.all()), [repository]) ?? EMPTY_KEYS;
}

const EMPTY_KEYS: ReadonlySet<string> = new Set();
