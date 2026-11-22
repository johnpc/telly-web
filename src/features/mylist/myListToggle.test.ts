import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { keyOf } from '@/core/db/channelIdentity';
import { MyListRepository } from '@/core/db/myListRepository';
import type { ChannelRow, ProgramRow } from '@/core/db/types';
import { freshDb } from '@/test/dbFixtures';
import {
  MY_LIST_ADD_LABEL,
  MY_LIST_REMOVE_LABEL,
  addToMyList,
  isSavedInMyList,
  myListKeyOf,
  myListKeysOf,
  myListLabel,
  programmeOf,
  toggleMyList,
  useMyListKeys,
} from './myListToggle';

const channel = { id: 1, name: 'News One', tvgId: 'news-one.id', streamUrl: 'http://x/1' } as ChannelRow;
const program: ProgramRow = {
  id: 1,
  channelTvgId: 'news-one.id',
  startMs: 1000,
  endMs: 2000,
  title: 'Newsroom Live',
  subTitle: 'Episode 8',
  description: 'desc',
  category: null,
  episode: 'S1 E8',
};

describe('myListToggle', () => {
  it('derives the programme, keys and labels', () => {
    expect(programmeOf(program)).toEqual({
      title: 'Newsroom Live: Episode 8. S1 E8',
      startMs: 1000,
      endMs: 2000,
      description: 'desc',
    });
    expect(myListKeyOf('k', 5)).toBe('k|5');
    expect(myListLabel(false)).toBe(MY_LIST_ADD_LABEL);
    expect(myListLabel(true)).toBe(MY_LIST_REMOVE_LABEL);
    const keys = new Set([myListKeyOf(keyOf(channel), 1000)]);
    expect(isSavedInMyList(keys, channel, 1000)).toBe(true);
    expect(isSavedInMyList(keys, channel, 2000)).toBe(false);
    expect(isSavedInMyList(keys, channel, null)).toBe(false);
  });

  it('saves then removes the same airing (toggle), stamping the add time', async () => {
    const repository = new MyListRepository(freshDb());
    expect(await toggleMyList(channel, programmeOf(program), repository, 42)).toBe(true);
    expect(await repository.all()).toMatchObject([
      { channelKey: 'news-one.id', startMs: 1000, addedAtMs: 42, title: 'Newsroom Live: Episode 8. S1 E8' },
    ]);
    expect(myListKeysOf(await repository.all())).toEqual(new Set(['news-one.id|1000']));
    expect(await toggleMyList(channel, programmeOf(program), repository, 43)).toBe(false);
    expect(await repository.all()).toEqual([]);
  });

  it('exposes the live key set and the dropdown helper over the default store', async () => {
    const repository = new MyListRepository(freshDb());
    const { result } = renderHook(() => useMyListKeys(repository));
    expect(result.current.size).toBe(0);
    await repository.upsert({
      channelKey: 'a',
      startMs: 1,
      endMs: 2,
      title: 't',
      description: null,
      addedAtMs: 0,
    });
    await waitFor(() => expect(result.current.has('a|1')).toBe(true));
    expect(await addToMyList(channel, program)).toBe(true);
    expect(await addToMyList(channel, program)).toBe(false);
  });
});
