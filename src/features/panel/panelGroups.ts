import type { CustomGroupMemberRow, CustomGroupRow } from '@/core/db/types';
import {
  type CustomGroup,
  ALL_CHANNELS,
  FAVORITES,
  channelsIn,
  groupNames,
  visibleGroupNames,
} from '@/core/channels/channelGroups';

export { type CustomGroup, ALL_CHANNELS, FAVORITES, channelsIn, groupNames };

/** Joins the two custom-group tables into the panel's shape. */
export function toCustomGroups(
  groups: readonly CustomGroupRow[],
  members: readonly CustomGroupMemberRow[],
): CustomGroup[] {
  return groups.map((group) => ({
    name: group.name,
    members: new Set(members.filter((m) => m.groupId === group.id).map((m) => m.channelKey)),
  }));
}

/** Appearance -> Groups: hidden synthetic groups drop out of the LIST only (Android `GroupVisibility`). */
export function visibleGroups(groups: readonly string[], allChannels: boolean, favorites: boolean): string[] {
  return visibleGroupNames(groups, { allChannels, favorites });
}
