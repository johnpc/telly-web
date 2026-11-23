// State behind the root-hosted reminder popup (port of Android
// `ReminderPopupController`): a due reminder shows title + channel +
// "Starts at HH:MM" with Watch now / Dismiss and auto-dismisses after 30 s.
import type { ReminderRow } from '@/core/db/types';
import { startTimeText } from '@/features/search/programTimes';

export interface ReminderPopupData {
  reminderId: number;
  channelId: number;
  channelName: string;
  programmeTitle: string;
  startsAtLabel: string;
}

// @stateMachine('Reminder popup')
/** Hidden · Shown(data, hide) — the auto-dismiss timer lives IN the state, so it cannot outlive the popup. */
export type ReminderPopupState =
  | { readonly kind: 'Hidden' }
  | {
      readonly kind: 'Shown';
      readonly data: ReminderPopupData;
      readonly hide: ReturnType<typeof setTimeout>;
    };

const HIDDEN: ReminderPopupState = { kind: 'Hidden' };

/** The popup lingers ~30 s, then goes away on its own. */
export const AUTO_DISMISS_MS = 30_000;

export class ReminderPopupController {
  private state: ReminderPopupState = HIDDEN;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly autoDismissMs: number = AUTO_DISMISS_MS) {}

  get current(): ReminderPopupState {
    return this.state;
  }

  get popup(): ReminderPopupData | null {
    return this.snapshot();
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly snapshot = (): ReminderPopupData | null => (this.state.kind === 'Shown' ? this.state.data : null);

  /** Fired by the engine: shows the popup and arms the auto-dismiss (re-arming replaces an earlier one). */
  show(reminder: ReminderRow, channelName: string): void {
    const data: ReminderPopupData = {
      reminderId: reminder.id,
      channelId: reminder.channelId,
      channelName,
      programmeTitle: reminder.title,
      startsAtLabel: `Starts at ${startTimeText(reminder.startMs)}`,
    };
    this.set({ kind: 'Shown', data, hide: setTimeout(() => this.dismiss(), this.autoDismissMs) });
  }

  dismiss(): void {
    if (this.state.kind === 'Shown') this.set(HIDDEN);
  }

  private set(next: ReminderPopupState): void {
    if (this.state.kind === 'Shown') clearTimeout(this.state.hide);
    this.state = next;
    this.listeners.forEach((listener) => listener());
  }
}
