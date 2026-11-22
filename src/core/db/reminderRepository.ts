import { putOrAdd } from './ordering';
import { type TellyDb, tellyDb } from './tellyDb';
import type { ReminderRow } from './types';

export type ReminderImport = Omit<ReminderRow, 'id' | 'firedAtMs'> & Partial<Pick<ReminderRow, 'firedAtMs'>>;

/** Persistence for programme reminders (Android `ReminderDao`). */
export class ReminderRepository {
  constructor(private readonly db: TellyDb = tellyDb) {}

  /** Re-reminding the same programme replaces its row (unique index); returns the row id. */
  upsert(reminder: ReminderImport): Promise<number> {
    return this.db.transaction('rw', this.db.reminders, async () => {
      const existing = await this.find(reminder.channelId, reminder.startMs, reminder.title);
      return putOrAdd(this.db.reminders, { ...reminder, firedAtMs: reminder.firedAtMs ?? 0 }, existing?.id);
    });
  }

  /** Upcoming reminders in air order (fired/ended rows are deleted by the engine). */
  async upcoming(): Promise<ReminderRow[]> {
    return (await this.db.reminders.toArray()).sort((a, b) => a.startMs - b.startMs || a.id - b.id);
  }

  /** Claims the popup exactly once: returns 1 when this call flipped PENDING -> FIRED. */
  markFired(id: number, atMs: number): Promise<number> {
    return this.db.reminders
      .where('id')
      .equals(id)
      .and((row) => row.firedAtMs === 0)
      .modify({ firedAtMs: atMs });
  }

  async find(channelId: number, startMs: number, title: string): Promise<ReminderRow | null> {
    const row = await this.db.reminders
      .where('[channelId+startMs+title]')
      .equals([channelId, startMs, title])
      .first();
    return row ?? null;
  }

  remove(id: number): Promise<void> {
    return this.db.reminders.delete(id);
  }
}

export const reminderRepository = new ReminderRepository();
