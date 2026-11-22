import { describe, expect, it, vi } from 'vitest';
import { ChannelRepository } from '@/core/db/channelRepository';
import { CustomGroupRepository } from '@/core/db/customGroupRepository';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { ParentalControls } from '@/core/settings/parentalControls';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { channelImport, freshDb } from '@/test/dbFixtures';
import { CopyChannelsSession } from './copyChannelsSession';
import { type CustomGroup, joinCustomGroups } from './customGroups';
import { AssignEpgSession, BulkFlagSession } from './flagSessions';
import { CreateGroupSession, GroupOptionsSession } from './groupNameSessions';
import type { GroupToolLive } from './groupToolSession';
import { createGroupToolStore } from './groupToolStore';
import { GroupTools } from './groupTools';
import { firstFocusId } from './toolRows';

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 25));

async function world() {
  const db = freshDb();
  const groups = new CustomGroupRepository(db);
  const channels = new ChannelRepository(db);
  await channels.replaceForPlaylist(1, [channelImport('News One'), channelImport('Sports Arena')]);
  const [, second] = await channels.all();
  if (second !== undefined) await channels.updateFlags(second.id, { hidden: true });
  const store = createGroupToolStore(groups, channels);
  const settings = new SettingsRepository(new MemoryKeyValueStore());
  const parental = new ParentalControls(settings);
  const live = async (): Promise<GroupToolLive> => ({
    channels: await channels.all(),
    groups: joinCustomGroups(await groups.groups(), await groups.members()),
    epgIds: ['alt.id'],
  });
  return { db, groups, channels, store, settings, parental, live, tools: new GroupTools(store, parental) };
}

describe('CreateGroupSession / GroupOptionsSession', () => {
  it('creates an empty group on commit and ignores blank names', async () => {
    const w = await world();
    const onDone = vi.fn();
    const session = new CreateGroupSession(w.store, onDone);
    expect(session.ui()).toMatchObject({ title: 'Create group', textInitial: '' });
    session.submitText('   ');
    session.submitText(' My Picks ');
    await tick();
    expect((await w.groups.groups()).map((g) => g.name)).toEqual(['My Picks']);
    expect(onDone).toHaveBeenCalledTimes(1);
    session.activate('x', await w.live());
    await session.submitPin('1');
  });
  it('renames and deletes custom groups; playlist groups render locked', async () => {
    const w = await world();
    const id = await w.groups.insertGroup('Mine');
    const custom: CustomGroup = { id, name: 'Mine', members: new Set() };
    const onDone = vi.fn();
    const session = new GroupOptionsSession('Mine', custom, w.store, onDone);
    let steps = 0;
    session.subscribe(() => (steps += 1));
    expect(session.ui().rows.map((r) => r.id)).toEqual(['rename', 'delete']);
    session.activate('rename');
    expect(session.ui()).toMatchObject({ title: 'Rename group', textInitial: 'Mine' });
    session.submitText('');
    session.submitText('Ours');
    await tick();
    expect((await w.groups.groups())[0]?.name).toBe('Ours');
    session.activate('delete');
    expect(session.ui().title).toBe('Delete Mine?');
    session.activate('cancel');
    expect(session.ui().title).toBe('Mine');
    session.activate('delete');
    session.activate('confirm');
    await tick();
    expect(await w.groups.groups()).toEqual([]);
    expect(onDone).toHaveBeenCalledTimes(2);
    expect(steps).toBe(4);
    const locked = new GroupOptionsSession('News', null, w.store, onDone);
    expect(locked.ui().rows.at(-1)).toMatchObject({ kind: 'note' });
    expect(firstFocusId(locked.ui().rows)).toBeNull();
    locked.submitText('x');
    locked.activate('confirm');
  });
});

describe('CopyChannelsSession', () => {
  it('asks for the target, toggles channels and copies them by key', async () => {
    const w = await world();
    const a = await w.groups.insertGroup('A');
    const b = await w.groups.insertGroup('B');
    const groups = [
      { id: a, name: 'A', members: new Set<string>() },
      { id: b, name: 'B', members: new Set<string>() },
    ];
    const onDone = vi.fn();
    const session = new CopyChannelsSession(groups, w.store, onDone);
    const live = await w.live();
    expect(session.ui(live).title).toBe('Copy channels to');
    session.activate('done', live);
    session.activate(`group:${b}`, live);
    expect(session.ui(live).title).toBe('Copy channels to B');
    const rows = session.ui(live).rows;
    expect(rows[0]).toMatchObject({ id: 'done' });
    expect(rows).toHaveLength(2);
    const channelRow = rows[1]?.id ?? '';
    session.activate(channelRow, live);
    expect(session.ui(live).rows[1]).toMatchObject({ checked: true });
    session.activate(channelRow, live);
    session.activate(channelRow, live);
    session.activate('done', live);
    await tick();
    expect((await w.groups.members()).map((m) => m.channelKey)).toEqual(['news-one.id']);
    expect(onDone).toHaveBeenCalled();
    expect(new CopyChannelsSession([], w.store, onDone).ui(live).rows[0]).toMatchObject({ kind: 'note' });
    const single = new CopyChannelsSession([groups[0] as CustomGroup], w.store, onDone);
    expect(single.ui(live).title).toBe('Copy channels to A');
  });
});

describe('AssignEpgSession / BulkFlagSession', () => {
  it('assigns an EPG id or resets to auto', async () => {
    const w = await world();
    const [channel] = await w.channels.all();
    if (channel === undefined) throw new Error('seed');
    const onDone = vi.fn();
    const session = new AssignEpgSession(channel, w.store, onDone);
    const live = await w.live();
    expect(session.ui(live).rows.map((r) => r.id)).toEqual(['auto', 'epg:alt.id']);
    session.activate('epg:alt.id');
    await tick();
    expect((await w.channels.byId(channel.id))?.epgOverride).toBe('alt.id');
    session.activate('auto');
    await tick();
    expect((await w.channels.byId(channel.id))?.epgOverride).toBeNull();
    session.activate('nope');
    expect(onDone).toHaveBeenCalledTimes(2);
  });
  it('toggles hidden/blocked flags and gates blocking behind the PIN', async () => {
    const w = await world();
    const live = await w.live();
    const visibility = new BulkFlagSession('Manage visibility', w.store, w.parental);
    expect(visibility.ui(live).rows).toHaveLength(2);
    visibility.activate(`channel:${live.channels[0]?.id}`, live);
    await tick();
    expect((await w.channels.all())[0]?.hidden).toBe(true);
    visibility.activate('bogus', live);
    visibility.activate('channel:999', live);
    w.settings.set(TellySettings.PARENTAL_ENABLED, true);
    await w.parental.setPin('1234');
    const blocking = new BulkFlagSession('Manage blocking', w.store, w.parental);
    expect(blocking.ui(live).pin).toBe(true);
    blocking.activate(`channel:${live.channels[0]?.id}`, live);
    await blocking.submitPin('0000');
    expect(blocking.ui(live).pin).toBe(true);
    await blocking.submitPin('1234');
    expect(blocking.ui(live).pin).toBe(false);
    blocking.activate(`channel:${live.channels[1]?.id}`, live);
    await tick();
    expect((await w.channels.all())[1]?.blocked).toBe(true);
  });
  it('the factory builds a session per sheet row', async () => {
    const w = await world();
    const [channel] = await w.channels.all();
    if (channel === undefined) throw new Error('seed');
    const context = { channel, group: 'News', groups: [], onDone: vi.fn() };
    for (const item of [
      'Create group',
      'Group options',
      'Copy channels',
      'Assign EPG',
      'Manage blocking',
      'Manage visibility',
    ] as const) {
      expect(w.tools.sessionFor(item, context)).not.toBeNull();
    }
    expect(w.tools.sessionFor('Search', context)).toBeNull();
  });
});
