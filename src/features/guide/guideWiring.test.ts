import { describe, expect, it, vi } from 'vitest';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { Navigator } from '@/core/navigation/navigator';
import type { PlayerEngine } from '@/core/player';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TuneController } from '@/features/playback/tune';
import { createGuideController } from './guideWiring';

describe('createGuideController', () => {
  it('wires the production repositories and routes through the navigator', () => {
    const navigator = new Navigator({ kind: 'Guide' });
    const tuner = new TuneController({
      engine: { load: vi.fn(), stop: vi.fn() } as unknown as PlayerEngine,
      store: new MemoryKeyValueStore(),
      recordWatch: async () => undefined,
    });
    const controller = createGuideController({
      tuner,
      settings: new SettingsRepository(new MemoryKeyValueStore()),
      navigator,
      tunesPreview: false,
    });
    controller.deps.open({ kind: 'Search' });
    expect(navigator.current).toEqual({ kind: 'Search' });
    controller.deps.onFullscreen();
    expect(navigator.current).toEqual({ kind: 'Playback' });
    expect(controller.deps.now()).toBeGreaterThan(0);
    expect(controller.deps.tunesPreview).toBe(false);
  });
});
