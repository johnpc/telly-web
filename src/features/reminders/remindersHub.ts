// App-scoped reminders wiring (port of Android `RemindersHub`/`RemindersLocator`):
// ONE popup controller + ONE engine shared by the dropdowns, the settings
// pane and the root-hosted popup. `RemindersHost` starts the ticks while it
// is mounted; a due reminder's channel name is resolved for the popup.
import { channelRepository } from '@/core/db/channelRepository';
import { reminderRepository } from '@/core/db/reminderRepository';
import { type ReminderRow, displayName } from '@/core/db/types';
import { SharedResource } from '@/core/state/sharedResource';
import { defaultSettingsRepository } from '@/core/settings/settingsContext';
import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { type ReminderEngine, createReminderEngine } from './reminderEngine';
import { ReminderPopupController } from './reminderPopup';
import { type TickerDeps, defaultTickerDeps, startReminderTicks } from './reminderTicker';

export interface RemindersHub {
  popup: ReminderPopupController;
  engine: ReminderEngine;
  /** Starts the ticks (shared while any host runs); the returned function stops this host's share. */
  start(): () => void;
}

/** A due reminder shows the popup with its channel's display name. */
function showDue(popup: ReminderPopupController): (reminder: ReminderRow) => void {
  return (reminder) => {
    void channelRepository
      .byId(reminder.channelId)
      .then((channel) => popup.show(reminder, channel === null ? '' : displayName(channel)));
  };
}

export function createRemindersHub(
  settings: SettingsRepository = defaultSettingsRepository,
  ticker: TickerDeps = defaultTickerDeps,
): RemindersHub {
  const popup = new ReminderPopupController();
  const engine = createReminderEngine({
    leadMinutes: () => settings.get(TellySettings.REMINDER_LEAD_MINUTES),
    onDue: showDue(popup),
    store: reminderRepository,
  });
  // The core `Shared resource lease`: one running ticker while any host holds it.
  const ticks = new SharedResource(
    () =>
      startReminderTicks(
        () => engine.tick(),
        (rows) => engine.sweep(rows),
        ticker,
      ),
    (stop) => stop(),
  );
  return { popup, engine, start: () => ticks.acquire().release };
}

export const remindersHub: RemindersHub = createRemindersHub();
