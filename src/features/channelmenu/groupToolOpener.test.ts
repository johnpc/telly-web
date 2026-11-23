import { describe, expect, it, vi } from 'vitest';
import { ChannelRepository } from '@/core/db/channelRepository';
import { CustomGroupRepository } from '@/core/db/customGroupRepository';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { ParentalControls } from '@/core/settings/parentalControls';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import type { GroupToolSession } from '@/features/groups/groupToolSession';
import { createGroupToolStore } from '@/features/groups/groupToolStore';
import { GroupTools } from '@/features/groups/groupTools';
import { channel } from '@/features/guide/testFixtures';
import { freshDb } from '@/test/dbFixtures';
import { type GroupToolHost, openGroupTool } from './groupToolOpener';

type Layer = 'Rest' | 'Sheet' | { tool: GroupToolSession };

function make() {
  const db = freshDb();
  const groups = new CustomGroupRepository(db);
  const tools = new GroupTools(
    createGroupToolStore(groups, new ChannelRepository(db)),
    new ParentalControls(new SettingsRepository(new MemoryKeyValueStore())),
  );
  let layer: Layer = 'Sheet';
  const host: GroupToolHost<Layer> = {
    current: () => layer,
    show: (next) => {
      layer = next;
    },
    done: vi.fn(() => {
      layer = 'Rest';
    }),
    toolLayer: (session) => ({ tool: session }),
    sessionOf: (l) => (typeof l === 'object' ? l.tool : null),
  };
  const input = { channel: channel(1), group: 'All channels', groups: [] };
  return { host, tools, groups, input, layer: () => layer };
}

describe('openGroupTool (Group tool completion)', () => {
  it('lands on the host only while that very session is still the layer', async () => {
    const { host, tools, groups, input, layer } = make();
    expect(openGroupTool(host, tools, 'Create group', input)).toBe(true);
    const shown = layer();
    if (typeof shown !== 'object') throw new Error('expected a tool layer');
    shown.tool.submitText('Picks');
    await vi.waitFor(() => expect(host.done).toHaveBeenCalledTimes(1));
    expect(await groups.groups()).toHaveLength(1);
    expect(openGroupTool(host, tools, 'Create group', input)).toBe(true);
    const second = layer();
    if (typeof second !== 'object') throw new Error('expected a tool layer');
    host.show('Sheet');
    second.tool.submitText('Late');
    await vi.waitFor(async () => expect(await groups.groups()).toHaveLength(2));
    expect(host.done).toHaveBeenCalledTimes(1);
    expect(layer()).toBe('Sheet');
  });
  it('declines rows the tools do not serve', () => {
    const { host, tools, input, layer } = make();
    expect(openGroupTool(host, tools, 'Search', input)).toBe(false);
    expect(layer()).toBe('Sheet');
  });
});
