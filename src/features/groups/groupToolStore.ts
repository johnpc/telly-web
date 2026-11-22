import { type ChannelRepository, channelRepository } from '@/core/db/channelRepository';
import { type CustomGroupRepository, customGroupRepository } from '@/core/db/customGroupRepository';
import type { GroupToolStore } from './groupToolSession';

/** The Dexie-backed `GroupToolStore` over the two repositories. */
export function createGroupToolStore(
  groups: CustomGroupRepository = customGroupRepository,
  channels: ChannelRepository = channelRepository,
): GroupToolStore {
  return {
    createGroup: (name) => groups.insertGroup(name),
    renameGroup: async (id, name) => {
      await groups.renameGroup(id, name);
    },
    deleteGroup: (id) => groups.deleteGroup(id),
    addMembers: (id, keys) => groups.insertMembers(keys.map((channelKey) => ({ groupId: id, channelKey }))),
    setEpgOverride: async (channelId, epgOverride) => {
      await channels.updateOverrides(channelId, { epgOverride });
    },
    setBlocked: async (channelId, blocked) => {
      await channels.updateFlags(channelId, { blocked });
    },
    setHidden: async (channelId, hidden) => {
      await channels.updateFlags(channelId, { hidden });
    },
  };
}
