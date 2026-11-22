import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReminderRow } from '@/core/db/types';
import { ReminderPopupController } from './reminderPopup';

const reminder: ReminderRow = {
  id: 7,
  channelId: 3,
  title: 'Newsroom Live',
  startMs: new Date(2026, 8, 14, 0, 45).getTime(),
  stopMs: 0,
  firedAtMs: 0,
};

describe('ReminderPopupController', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the due reminder with its start time, auto-dismisses, and dismisses on demand', () => {
    const popup = new ReminderPopupController(1000);
    const listener = vi.fn();
    popup.subscribe(listener);
    popup.show(reminder, 'News One');
    expect(popup.snapshot()).toEqual({
      reminderId: 7,
      channelId: 3,
      channelName: 'News One',
      programmeTitle: 'Newsroom Live',
      startsAtLabel: 'Starts at 12:45 AM',
    });
    vi.advanceTimersByTime(999);
    expect(popup.popup).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(popup.popup).toBeNull();
    popup.show(reminder, 'News One');
    popup.dismiss();
    popup.dismiss();
    expect(popup.popup).toBeNull();
    expect(listener).toHaveBeenCalledTimes(4);
  });
});
