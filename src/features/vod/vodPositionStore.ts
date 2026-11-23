import type { VodPositionRow } from '@/core/db/types';
import type { VodRepository } from '@/core/db/vodRepository';
import { finished } from './vodResumePolicy';

export type VodPositionDao = Pick<VodRepository, 'positionByKey' | 'savePosition' | 'removePosition'>;

/**
 * Resume-position policy over the vod_positions table (Android
 * `VodPositionStore`): nothing is read or written while "Remember playback
 * position" is off, finished items clear their row, and unknown durations
 * are never persisted.
 */
export class VodPositionStore {
  constructor(
    private readonly dao: VodPositionDao,
    private readonly remember: () => boolean,
    private readonly clock: () => number,
  ) {}

  read(itemKey: string): Promise<VodPositionRow | null> {
    return this.remember() ? this.dao.positionByKey(itemKey) : Promise.resolve(null);
  }

  /** Media end: position == duration counts as finished, clearing the row. */
  finish(itemKey: string, durationMs: number): Promise<void> {
    return this.save(itemKey, durationMs, durationMs);
  }

  async save(itemKey: string, positionMs: number, durationMs: number): Promise<void> {
    if (!this.remember() || durationMs <= 0) return;
    if (finished(positionMs, durationMs)) {
      await this.dao.removePosition(itemKey);
      return;
    }
    await this.dao.savePosition({ itemKey, positionMs, durationMs, updatedAtMs: this.clock() });
  }
}
