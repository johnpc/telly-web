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

/** The popup lingers ~30 s, then goes away on its own. */
export const AUTO_DISMISS_MS = 30_000;

export class ReminderPopupController {
  private data: ReminderPopupData | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly autoDismissMs: number = AUTO_DISMISS_MS) {}

  get popup(): ReminderPopupData | null {
    return this.data;
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly snapshot = (): ReminderPopupData | null => this.data;

  /** Fired by the engine: shows the popup and arms the auto-dismiss. */
  show(reminder: ReminderRow, channelName: string): void {
    this.set({
      reminderId: reminder.id,
      channelId: reminder.channelId,
      channelName,
      programmeTitle: reminder.title,
      startsAtLabel: `Starts at ${startTimeText(reminder.startMs)}`,
    });
    this.clearTimer();
    this.hideTimer = setTimeout(() => this.dismiss(), this.autoDismissMs);
  }

  dismiss(): void {
    this.clearTimer();
    if (this.data !== null) this.set(null);
  }

  private clearTimer(): void {
    if (this.hideTimer !== null) clearTimeout(this.hideTimer);
    this.hideTimer = null;
  }

  private set(data: ReminderPopupData | null): void {
    this.data = data;
    this.listeners.forEach((listener) => listener());
  }
}
