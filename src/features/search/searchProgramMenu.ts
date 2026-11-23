// The programme dropdown's live actions (guide-cell parity, port of Android
// `SearchProgramMenu`): Remind toggles a reminder and relabels, Add to My list
// toggles the programme, Program description stays on the branded placeholder
// exactly like the guide's cell dropdown. Record / Custom recording act
// through the DVR slice's search adapter (one per overlay stack).
import type { ChannelRow, ProgramRow } from '@/core/db/types';
import { isSavedInMyList, myListLabel, programmeOf, toggleMyList } from '@/features/mylist/myListToggle';
import { searchRecordingFor } from '@/features/recording';
import { reminderLabel, toggleReminder } from '@/features/reminders/guideReminders';
import { type SearchOverlays, type SearchProgramAction } from './searchOverlay';
import type { SearchProgramHit } from './searchResults';

export interface SearchMenuHooks {
  toggleReminder(channel: ChannelRow, program: ProgramRow): Promise<unknown>;
  toggleMyList(channel: ChannelRow, program: ProgramRow): Promise<unknown>;
}

export const defaultMenuHooks: SearchMenuHooks = {
  toggleReminder,
  toggleMyList: (channel, program) => toggleMyList(channel, programmeOf(program)),
};

/** The row label for `action` on `hit` ("Remove reminder" / "Remove from My list" while set). */
export function menuLabel(
  action: SearchProgramAction,
  hit: SearchProgramHit,
  reminderKeys: ReadonlySet<string>,
  myListKeys: ReadonlySet<string>,
): string {
  if (action === 'Remind') return reminderLabel(reminderKeys, hit.channel.id, hit.program);
  if (action === 'Add to My list')
    return myListLabel(isSavedInMyList(myListKeys, hit.channel, hit.program.startMs));
  return action;
}

export function runMenuAction(
  action: SearchProgramAction,
  hit: SearchProgramHit,
  overlays: SearchOverlays,
  hooks: SearchMenuHooks = defaultMenuHooks,
): void {
  switch (action) {
    case 'Remind':
      void hooks.toggleReminder(hit.channel, hit.program);
      overlays.dismiss();
      return;
    case 'Add to My list':
      void hooks.toggleMyList(hit.channel, hit.program);
      overlays.dismiss();
      return;
    case 'Record':
      return searchRecordingFor(overlays).record(hit.channel, hit.program, Date.now());
    case 'Custom recording':
      return searchRecordingFor(overlays).customRecording(hit.channel);
    default:
      overlays.show({ kind: 'ComingSoon', feature: action });
  }
}
