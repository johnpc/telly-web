import { afterEach, describe, expect, it } from 'vitest';
import { defaultSettingsRepository } from '@/core/settings/settingsContext';
import { TellySettings } from '@/core/settings/tellySettings';
import { stubMediaPlayback } from '@/core/player/testSupport';
import { createMultiviewViewModel, createPaneEngine, multiviewDeps } from './multiviewDeps';

describe('multiviewDeps', () => {
  afterEach(() => defaultSettingsRepository.set(TellySettings.CORS_PROXY, ''));

  it('builds an independent pane engine with its own video element', () => {
    stubMediaPlayback();
    const engine = createPaneEngine();
    expect(engine.video).toBeInstanceOf(HTMLVideoElement);
    expect(engine.video?.dataset.testid).toBe('video-surface');
    engine.release();
    expect(engine.video).toBeNull();
    expect(multiviewDeps.resolveUrl('http://x/1.ts')).toBe('http://x/1.ts');
    defaultSettingsRepository.set(TellySettings.CORS_PROXY, 'https://p/?url=');
    expect(multiviewDeps.resolveUrl('http://x/1.ts')).toBe(
      `https://p/?url=${encodeURIComponent('http://x/1.ts')}`,
    );
  });

  it('wires the ViewModel over the production seams', async () => {
    const vm = createMultiviewViewModel(multiviewDeps, () => undefined);
    expect(vm.layer).toEqual({ kind: 'Panes' });
    expect(vm.gate.promptOpen).toBe(false);
    expect(await multiviewDeps.channels()).toEqual([]);
  });
});
