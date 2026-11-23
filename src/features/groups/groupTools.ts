import type { ChannelRow } from '@/core/db/types';
import type { ParentalControls } from '@/core/settings/parentalControls';
import type { SheetItem } from '@/features/channelmenu/sheetMenu';
import { CopyChannelsSession } from './copyChannelsSession';
import type { CustomGroup } from './customGroups';
import { AssignEpgSession, BulkFlagSession } from './flagSessions';
import { CreateGroupSession, GroupOptionsSession } from './groupNameSessions';
import type { GroupToolSession, GroupToolStore } from './groupToolSession';

/** What a tool session is opened on: the sheet's row channel + selected group + the custom groups now. */
export interface GroupToolContext {
  channel: ChannelRow;
  group: string;
  groups: readonly CustomGroup[];
  onDone: () => void;
}

/**
 * The factory behind the six group/bulk context-sheet rows (Android
 * `GroupTools`): one session per row activation, all writing through the
 * same store so the guide's and the panel's sheets cannot drift.
 */
export class GroupTools {
  constructor(
    private readonly store: GroupToolStore,
    private readonly parental: ParentalControls,
  ) {}

  /** The tool screen behind `item`, or null for non-tool rows. */
  sessionFor(item: SheetItem, context: GroupToolContext): GroupToolSession | null {
    switch (item) {
      case 'Create group':
        return new CreateGroupSession(this.store, context.onDone);
      case 'Group options':
        return new GroupOptionsSession(
          context.group,
          context.groups.find((g) => g.name === context.group) ?? null,
          this.store,
          context.onDone,
        );
      case 'Copy channels':
        return new CopyChannelsSession(context.groups, this.store, context.onDone);
      case 'Assign EPG':
        return new AssignEpgSession(context.channel, this.store, context.onDone);
      case 'Manage blocking':
      case 'Manage visibility':
        return new BulkFlagSession(item, this.store, this.parental);
      default:
        return null;
    }
  }
}
