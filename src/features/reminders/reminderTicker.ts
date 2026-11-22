// The web-side ticks for the reminder engine: a ~15 s interval while the tab
// is visible (a hidden tab's timers are throttled anyway, and a popup nobody
// can see must not claim the reminder), an immediate sweep when the tab comes
// back, and a sweep on every change to the reminders table.
import { liveQuery } from 'dexie';
import { type TellyDb, tellyDb } from '@/core/db/tellyDb';
import type { ReminderRow } from '@/core/db/types';

export const TICK_MS = 15_000;

export interface TickerDeps {
  db: TellyDb;
  intervalMs: number;
  /** `document` surface the ticker reads; null (tests) means always visible. */
  visibility: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'> | null;
}

export const defaultTickerDeps: TickerDeps = {
  db: tellyDb,
  intervalMs: TICK_MS,
  visibility: typeof document === 'undefined' ? null : document,
};

export function isVisible(deps: TickerDeps): boolean {
  return deps.visibility === null || deps.visibility.visibilityState === 'visible';
}

/** Starts the ticks; the returned function stops them. */
export function startReminderTicks(
  onTick: () => Promise<void>,
  onRows: (rows: ReminderRow[]) => Promise<void>,
  deps: TickerDeps = defaultTickerDeps,
): () => void {
  const guarded = (): void => {
    if (isVisible(deps)) void onTick();
  };
  const timer = setInterval(guarded, deps.intervalMs);
  const subscription = liveQuery(() => deps.db.reminders.toArray()).subscribe({
    next: (rows) => {
      if (isVisible(deps)) void onRows(rows);
    },
    error: (error: unknown) => console.error('reminders live query failed', error),
  });
  deps.visibility?.addEventListener('visibilitychange', guarded);
  return () => {
    clearInterval(timer);
    subscription.unsubscribe();
    deps.visibility?.removeEventListener('visibilitychange', guarded);
  };
}
