import type { ChannelRow } from '@/core/db/types';
import type { CustomGroup } from '@/features/groups/customGroups';
import type { GroupTools } from '@/features/groups/groupTools';
import type { GuideMenuController } from './guideMenuController';
import { ROW_MENU } from './guideLayer';
import type { SheetItem } from './sheetMenu';

/**
 * A group/bulk tool pushed over the sheet; a finished action lands on the
 * grid. Open(session) · Done: the async completion pops ONLY while this
 * tool is still the layer — a BACK that already popped it must not make
 * `onDone` pop the sheet too (Android `openGroupTool`).
 */
// @stateMachine('Group tool completion')
export function openGroupTool(
  menu: GuideMenuController,
  tools: GroupTools,
  item: SheetItem,
  channel: ChannelRow,
  group: string,
  groups: readonly CustomGroup[],
): void {
  let opened: object | null = null;
  const onDone = (): void => {
    const layer = menu.layer;
    if (layer.kind === 'GroupTool' && layer.session === opened) menu.reset();
  };
  const session = tools.sessionFor(item, { channel, group, groups, onDone });
  opened = session;
  if (session === null) menu.comingSoon(item, ROW_MENU);
  else menu.show({ kind: 'GroupTool', session });
}
