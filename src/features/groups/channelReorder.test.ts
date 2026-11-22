import { describe, expect, it, vi } from 'vitest';
import { channel } from '@/features/guide/testFixtures';
import { ChannelEdit } from './channelEdit';
import { editorRows, favorites, moveFavorite, moveInGroup, toggled } from './channelReorder';
import { activatable, action, firstFocusId, note, toggle, value } from './toolRows';
import { joinCustomGroups } from './customGroups';

const list = [
  channel(1, { favorite: true, favoriteOrder: 1 }),
  channel(2),
  channel(3, { favorite: true, favoriteOrder: 0 }),
  channel(4, { groupTitle: 'Sports' }),
];

describe('channelReorder', () => {
  it('orders favorites, lists the editor rows and toggles with an appended order', () => {
    expect(favorites(list).map((c) => c.id)).toEqual([3, 1]);
    expect(editorRows(list).map((c) => c.id)).toEqual([3, 1, 2, 4]);
    expect(toggled(list, list[1] as never)).toMatchObject({ favorite: true, favoriteOrder: 2 });
    expect(toggled(list, list[0] as never)).toMatchObject({ favorite: false });
    expect(toggled([], channel(9))).toMatchObject({ favoriteOrder: 0 });
  });
  it('moves favorites and group neighbours, returning only the changed rows', () => {
    expect(moveFavorite(list, 1, -1).map((c) => [c.id, c.favoriteOrder])).toEqual([
      [1, 0],
      [3, 1],
    ]);
    expect(moveFavorite(list, 1, 1)).toEqual([]);
    expect(moveFavorite(list, 2, 1)).toEqual([]);
    expect(moveInGroup(list, 2, 1).map((c) => [c.id, c.sortIndex])).toEqual([
      [2, 3],
      [3, 2],
    ]);
    expect(moveInGroup(list, 4, 1)).toEqual([]);
    expect(moveInGroup(list, 9, 1)).toEqual([]);
  });
});

describe('ChannelEdit', () => {
  it('Manage Favorites toggles and reorders favorites; a group reorders by sort index', async () => {
    const persist = vi.fn(async () => undefined);
    const favs = new ChannelEdit(persist);
    expect(favs.rows(list).map((c) => c.id)).toEqual([3, 1, 2, 4]);
    await favs.toggle(list, list[1] as never);
    expect(persist).toHaveBeenCalledWith([expect.objectContaining({ id: 2, favorite: true })]);
    await favs.move(list, 1, -1);
    expect(persist).toHaveBeenCalledTimes(2);
    await favs.move(list, 2, 1);
    expect(persist).toHaveBeenCalledTimes(2);
    const group = new ChannelEdit(persist, 'News');
    expect(group.rows(list).map((c) => c.id)).toEqual([1, 2, 3]);
    await group.toggle(list, list[0] as never);
    expect(persist).toHaveBeenCalledTimes(2);
    await group.move(list, 1, 1);
    expect(persist).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 1, sortIndex: 2 }),
      expect.objectContaining({ id: 2, sortIndex: 1 }),
    ]);
    await new ChannelEdit(persist, 'Favorites').move(list, 1, -1);
    expect(persist).toHaveBeenCalledTimes(4);
  });
});

describe('toolRows / customGroups', () => {
  it('builds rows and finds the first activatable one', () => {
    const rows = [note('n'), action('a', 'A', true), toggle('t', 'T', true), value('v', 'V', 's', true)];
    expect(rows.map(activatable)).toEqual([false, false, true, true]);
    expect(firstFocusId(rows)).toBe('t');
    expect(rows[3]).toEqual({ kind: 'value', id: 'v', title: 'V', summary: 's', selected: true });
  });
  it('joins groups with their member keys in column order', () => {
    const joined = joinCustomGroups(
      [
        { id: 2, name: 'B', sortIndex: 1 },
        { id: 1, name: 'A', sortIndex: 0 },
      ],
      [
        { groupId: 2, channelKey: 'x' },
        { groupId: 2, channelKey: 'y' },
      ],
    );
    expect(joined.map((g) => g.name)).toEqual(['A', 'B']);
    expect([...(joined[1]?.members ?? [])]).toEqual(['x', 'y']);
  });
});
