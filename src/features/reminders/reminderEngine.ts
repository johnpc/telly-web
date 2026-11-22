// Watches the upcoming reminders (port of Android `ReminderEngine`); when a
// reminder's programme is within the configured lead time it emits `onDue`
// EXACTLY once and deletes the row. The claim is PERSISTED first (`firedAtMs`,
// a guarded PENDING -> FIRED update), so a tab that dies between popup and
// delete removes the row on the next start instead of firing it again.
// Reminders whose programme already ended are dropped silently. No wall-clock
// reads: the clock and the sweeps are injected.
import { type ReminderRepository, reminderRepository } from '@/core/db/reminderRepository';
import type { ReminderRow } from '@/core/db/types';
import { MINUTE_MS, reminderStateOf } from './reminderDue';

export interface ReminderEngineDeps {
  store: ReminderRepository;
  clock: () => number;
  leadMinutes: () => number;
  onDue: (reminder: ReminderRow) => void;
}

export class ReminderEngine {
  /** Ids already handled this session; guards re-emission until the live query catches up. */
  private readonly handled = new Set<number>();

  constructor(private readonly deps: ReminderEngineDeps) {}

  /** One sweep over the current list (every tick and every change to the reminders). */
  async sweep(reminders: readonly ReminderRow[]): Promise<void> {
    this.retainHandled(reminders);
    const now = this.deps.clock();
    const leadMs = this.deps.leadMinutes() * MINUTE_MS;
    for (const reminder of reminders.filter((row) => !this.handled.has(row.id))) {
      await this.handle(reminder, now, leadMs);
    }
  }

  /** Forget handled ids whose rows are gone, so a re-created reminder is a fresh one. */
  private retainHandled(reminders: readonly ReminderRow[]): void {
    const alive = new Set(reminders.map((row) => row.id));
    for (const id of this.handled) if (!alive.has(id)) this.handled.delete(id);
  }

  /** Reads the current list and sweeps it. */
  async tick(): Promise<void> {
    await this.sweep(await this.deps.store.upcoming());
  }

  private async handle(reminder: ReminderRow, now: number, leadMs: number): Promise<void> {
    // Claimed by a previous session that died before the delete.
    if (reminder.firedAtMs !== 0) return this.drop(reminder);
    const state = reminderStateOf(reminder, now, leadMs);
    if (state === 'DUE') return this.fire(reminder, now);
    if (state === 'EXPIRED') return this.drop(reminder);
  }

  private async fire(reminder: ReminderRow, now: number): Promise<void> {
    this.handled.add(reminder.id);
    if ((await this.deps.store.markFired(reminder.id, now)) === 0) return;
    this.deps.onDue(reminder);
    await this.deps.store.remove(reminder.id);
  }

  private async drop(reminder: ReminderRow): Promise<void> {
    this.handled.add(reminder.id);
    await this.deps.store.remove(reminder.id);
  }
}

export function createReminderEngine(
  deps: Partial<ReminderEngineDeps> & Pick<ReminderEngineDeps, 'onDue' | 'leadMinutes'>,
): ReminderEngine {
  return new ReminderEngine({ store: reminderRepository, clock: () => Date.now(), ...deps });
}
