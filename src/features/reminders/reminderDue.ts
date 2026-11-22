// Pure due-state math for one reminder (port of Android `ReminderDue`): DUE
// once "now" reaches start − lead (TiviMate pops the reminder shortly before
// the programme starts), EXPIRED once the programme ended without firing (a
// reminder set for the past never pops), PENDING otherwise. FIRED is the
// PERSISTED claim (`firedAtMs`, a guarded update) the engine writes before
// the popup, so a crash can never fire a reminder twice.
// @stateMachine('Reminder')
import type { ReminderRow } from '@/core/db/types';

export type ReminderDueState = 'PENDING' | 'DUE' | 'EXPIRED';

export const MINUTE_MS = 60_000;

export function reminderStateOf(
  reminder: Pick<ReminderRow, 'startMs' | 'stopMs'>,
  nowMs: number,
  leadMs: number,
): ReminderDueState {
  if (nowMs >= reminder.stopMs) return 'EXPIRED';
  if (nowMs >= reminder.startMs - leadMs) return 'DUE';
  return 'PENDING';
}
