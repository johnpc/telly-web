// App-scoped reminders wiring (port of Android `RemindersHub`/`RemindersLocator`):
// ONE popup controller + ONE engine shared by the dropdowns, the settings
// pane and the root-hosted popup. `RemindersHost` starts the ticks while it
// is mounted; a due reminder's channel name is resolved for the popup.
import { channelRepository } from '@/core/db/channelRepository';
import { reminderRepository } from '@/core/db/reminderRepository';
import { type ReminderRow, displayName } from '@/core/db/types';
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

/** Refcounted start/stop so several hosts share one running ticker. */
export class SharedTicks {
  private running = 0;
  private stop: (() => void) | null = null;

  constructor(private readonly begin: () => () => void) {}

  readonly start = (): (() => void) => {
    this.running += 1;
    this.stop ??= this.begin();
    return () => this.release();
  };

  get active(): boolean {
    return this.stop !== null;
  }

  private release(): void {
    this.running -= 1;
    if (this.running > 0) return;
    this.stop?.();
    this.stop = null;
  }
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
  const ticks = new SharedTicks(() =>
    startReminderTicks(
      () => engine.tick(),
      (rows) => engine.sweep(rows),
      ticker,
    ),
  );
  return { popup, engine, start: ticks.start };
}

export const remindersHub: RemindersHub = createRemindersHub();
