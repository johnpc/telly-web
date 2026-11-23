import type { ChannelRow } from '@/core/db/types';
import type { CustomGroup } from '@/features/groups/customGroups';
import type { GroupToolSession } from '@/features/groups/groupToolSession';
import type { GroupTools } from '@/features/groups/groupTools';
import type { SheetItem } from './sheetMenu';

/** How a host shows a tool session as its own layer and tells it apart afterwards. */
export interface GroupToolHost<L> {
  current(): L;
  show(layer: L): void;
  /** Where a FINISHED tool lands (the grid / the panel). */
  done(): void;
  toolLayer(session: GroupToolSession): L;
  /** The session `layer` shows, or null when it is not a tool layer. */
  sessionOf(layer: L): GroupToolSession | null;
}

/** What a tool is opened on: the sheet's row channel, the selected group and the custom groups now. */
export interface GroupToolInput {
  channel: ChannelRow;
  group: string;
  groups: readonly CustomGroup[];
}

/**
 * A group/bulk tool pushed over the sheet; a finished action lands on the
 * host. Open(session) · Done: the async completion pops ONLY while this
 * tool is still the layer — a BACK that already popped it must not make
 * `onDone` pop the sheet too (Android `openGroupTool`, both hosts).
 * Returns false for a row the tools do not serve.
 */
// @stateMachine('Group tool completion')
export function openGroupTool<L>(
  host: GroupToolHost<L>,
  tools: GroupTools,
  item: SheetItem,
  input: GroupToolInput,
): boolean {
  let opened: GroupToolSession | null = null;
  const onDone = (): void => {
    if (opened !== null && host.sessionOf(host.current()) === opened) host.done();
  };
  const session = tools.sessionFor(item, { ...input, onDone });
  opened = session;
  if (session === null) return false;
  host.show(host.toolLayer(session));
  return true;
}
