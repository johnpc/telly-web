import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChannelRepository } from '@/core/db/channelRepository';
import { CustomGroupRepository } from '@/core/db/customGroupRepository';
import { ProgramRepository } from '@/core/db/programRepository';
import { channelImport, freshDb, programImport } from '@/test/dbFixtures';
import { useChannelEdit } from './useChannelEdit';
import { useCustomGroups } from './useCustomGroups';
import { useGroupToolLive } from './useGroupToolLive';

describe('groups hooks', () => {
  it('reads custom groups, the tool live tables and the channel editor live', async () => {
    const db = freshDb();
    const groups = new CustomGroupRepository(db);
    const channels = new ChannelRepository(db);
    const programs = new ProgramRepository(db);
    await groups.insertGroup('Mine');
    await channels.replaceForPlaylist(1, [channelImport('A'), channelImport('B')]);
    await programs.replaceFor(['a.id'], [programImport('a.id', 0, 1)]);
    const custom = renderHook(() => useCustomGroups(groups));
    await vi.waitFor(() => expect(custom.result.current.map((g) => g.name)).toEqual(['Mine']));
    const live = renderHook(() => useGroupToolLive(channels, programs));
    await vi.waitFor(() => expect(live.result.current.channels).toHaveLength(2));
    expect(live.result.current.epgIds).toEqual(['a.id']);
    const edit = renderHook(() => useChannelEdit(null, channels));
    await vi.waitFor(() => expect(edit.result.current.rows).toHaveLength(2));
    const first = edit.result.current.rows[0];
    if (first === undefined) throw new Error('rows');
    edit.result.current.toggle(first);
    await vi.waitFor(async () => expect((await channels.byId(first.id))?.favorite).toBe(true));
    edit.result.current.move(first.id, 1);
  });
});
