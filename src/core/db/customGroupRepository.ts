import { type TellyDb, tellyDb } from './tellyDb';
import type { CustomGroupMemberRow, CustomGroupRow } from './types';

/** Persistence for custom groups and their channel membership (Android `CustomGroupDao`). */
export class CustomGroupRepository {
  constructor(private readonly db: TellyDb = tellyDb) {}

  groups(): Promise<CustomGroupRow[]> {
    return this.db.custom_groups.orderBy('sortIndex').toArray();
  }

  members(): Promise<CustomGroupMemberRow[]> {
    return this.db.custom_group_members.toArray();
  }

  async maxSortIndex(): Promise<number> {
    const last = await this.db.custom_groups.orderBy('sortIndex').last();
    return last?.sortIndex ?? -1;
  }

  /** Appends a group after the existing ones; returns its id. */
  insertGroup(name: string): Promise<number> {
    return this.db.transaction('rw', this.db.custom_groups, async () =>
      this.db.custom_groups.add({ name, sortIndex: (await this.maxSortIndex()) + 1 }),
    );
  }

  renameGroup(id: number, name: string): Promise<number> {
    return this.db.custom_groups.update(id, { name });
  }

  /** Adding an existing membership is a no-op (Room `OnConflictStrategy.IGNORE`). */
  async insertMembers(members: readonly CustomGroupMemberRow[]): Promise<void> {
    await this.db.custom_group_members.bulkPut([...members]);
  }

  removeMember(groupId: number, channelKey: string): Promise<void> {
    return this.db.custom_group_members.delete([groupId, channelKey]);
  }

  /** Deleting a group removes its membership rows with it. */
  deleteGroup(id: number): Promise<void> {
    const { db } = this;
    return db.transaction('rw', [db.custom_groups, db.custom_group_members], async () => {
      await db.custom_group_members.where('groupId').equals(id).delete();
      await db.custom_groups.delete(id);
    });
  }
}

export const customGroupRepository = new CustomGroupRepository();
