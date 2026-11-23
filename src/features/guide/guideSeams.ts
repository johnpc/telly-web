import { type MyListRepository, myListRepository } from '@/core/db/myListRepository';
import { type ReminderRepository, reminderRepository } from '@/core/db/reminderRepository';
import type { ChannelRow, ProgramRow } from '@/core/db/types';
import { programmeOf, toggleMyList } from '@/features/mylist/myListToggle';

/** Identity of a reminder as the guide dropdown sees it (Android `ReminderKey`). */
export function reminderKey(channelId: number, startMs: number, title: string): string {
  return `${channelId}|${startMs}|${title}`;
}

/** The cross-slice writes the dropdown/sheet rows perform. */
export interface GuideSeams {
  /** Save/remove the programme; the row label flips via the live key set. */
  toggleMyList(channel: ChannelRow, program: ProgramRow): Promise<void>;
  toggleReminder(channel: ChannelRow, program: ProgramRow): Promise<void>;
  /** "Open in external player": the web has no handler; a new tab is the closest hand-off. */
  openExternal(channel: ChannelRow): void;
}

export interface GuideSeamDeps {
  myList?: MyListRepository;
  reminders?: ReminderRepository;
  now?: () => number;
  openUrl?: (url: string) => void;
}

function myListToggle(myList: MyListRepository, now: () => number): GuideSeams['toggleMyList'] {
  return async (channel, program) => {
    await toggleMyList(channel, programmeOf(program), myList, now());
  };
}

function reminderToggle(reminders: ReminderRepository): GuideSeams['toggleReminder'] {
  return async (channel, program) => {
    const { startMs, title } = program;
    const existing = await reminders.find(channel.id, startMs, title);
    if (existing !== null) return reminders.remove(existing.id);
    await reminders.upsert({ channelId: channel.id, title, startMs, stopMs: program.endMs });
  };
}

export function createGuideSeams(deps: GuideSeamDeps = {}): GuideSeams {
  const openUrl = deps.openUrl ?? ((url: string): void => void window.open(url, '_blank', 'noopener'));
  return {
    toggleMyList: myListToggle(deps.myList ?? myListRepository, deps.now ?? ((): number => Date.now())),
    toggleReminder: reminderToggle(deps.reminders ?? reminderRepository),
    openExternal: (channel) => openUrl(channel.streamUrl),
  };
}
