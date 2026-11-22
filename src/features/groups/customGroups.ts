import type { CustomGroupMemberRow, CustomGroupRow } from '@/core/db/types';

/**
 * One custom group with its membership, as consumed by the group columns
 * (Android `CustomGroup`): `members` holds refresh-stable channel keys.
 */
export interface CustomGroup {
  id: number;
  name: string;
  members: ReadonlySet<string>;
}

function membersByGroup(members: readonly CustomGroupMemberRow[]): Map<number, Set<string>> {
  const out = new Map<number, Set<string>>();
  for (const member of members) {
    const set = out.get(member.groupId) ?? new Set<string>();
    set.add(member.channelKey);
    out.set(member.groupId, set);
  }
  return out;
}

function byColumnOrder(a: CustomGroupRow, b: CustomGroupRow): number {
  return a.sortIndex - b.sortIndex || a.id - b.id;
}

/** Joins the two tables into column-ordered groups with their member keys. */
export function joinCustomGroups(
  groups: readonly CustomGroupRow[],
  members: readonly CustomGroupMemberRow[],
): CustomGroup[] {
  const keys = membersByGroup(members);
  return [...groups]
    .sort(byColumnOrder)
    .map((g) => ({ id: g.id, name: g.name, members: keys.get(g.id) ?? new Set() }));
}
