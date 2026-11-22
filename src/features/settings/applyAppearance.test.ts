import { describe, expect, it } from 'vitest';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { applyAppearance, fontScaleFor, observeAppearance, type AppearanceRoot } from './applyAppearance';

function fakeRoot(): AppearanceRoot & { vars: Record<string, string> } {
  const vars: Record<string, string> = {};
  return {
    vars,
    lang: '',
    style: { setProperty: (name: string, value: string | null) => void (vars[name] = value ?? '') },
  };
}

describe('applyAppearance', () => {
  it('writes accent, font scale and language, and follows later changes', () => {
    const settings = new SettingsRepository(new MemoryKeyValueStore());
    const root = fakeRoot();
    const stop = observeAppearance(settings, root);
    expect(root.vars['--telly-accent']).toBe('#2196f3');
    expect(root.vars['--telly-font-scale']).toBe('1');
    expect(root.lang).toBe('');
    settings.set(TellySettings.ACCENT_COLOR, 'Green');
    settings.set(TellySettings.FONT_SIZE, 'Large');
    settings.set(TellySettings.LANGUAGE, 'Español');
    expect(root.vars['--telly-accent']).toBe('#4caf50');
    expect(root.vars['--telly-font-scale']).toBe('1.125');
    expect(root.lang).toBe('es');
    stop();
    settings.set(TellySettings.FONT_SIZE, 'Small');
    expect(root.vars['--telly-font-scale']).toBe('1.125');
    applyAppearance(settings, root);
    expect(root.vars['--telly-font-scale']).toBe('0.875');
    expect(fontScaleFor('Huge')).toBe(1.25);
    expect(fontScaleFor('???')).toBe(1);
  });

  it('defaults to the document root', () => {
    applyAppearance(new SettingsRepository(new MemoryKeyValueStore({ appearance_accent_color: 'Pink' })));
    expect(document.documentElement.style.getPropertyValue('--telly-accent')).toBe('#e91e63');
  });
});
