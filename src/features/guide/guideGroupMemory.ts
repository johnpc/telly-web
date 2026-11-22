import type { KeyValueStore } from '@/core/kv/keyValueStore';
import { ALL_CHANNELS } from './guideRowsBuilder';

export const GROUP_KEY = 'guideGroup';

/**
 * Remembers the guide's selected group across the fullscreen→back screen
 * rebuild (persisted in the scalar KV store; Android `GuideGroupMemory`).
 */
export class GuideGroupMemory {
  private selected: string;

  constructor(private readonly store: KeyValueStore) {
    this.selected = store.get(GROUP_KEY) ?? ALL_CHANNELS;
  }

  get value(): string {
    return this.selected;
  }

  /** True when the group actually changed (the caller resets focus/scroll). */
  select(next: string): boolean {
    if (next === this.selected) return false;
    this.selected = next;
    this.store.set(GROUP_KEY, next);
    return true;
  }

  /** A restored group the playlist no longer has falls back to All channels (never an empty grid). */
  validate(names: readonly string[]): boolean {
    return names.includes(this.selected) ? false : this.select(ALL_CHANNELS);
  }
}
