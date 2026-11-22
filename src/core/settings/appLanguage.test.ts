import { describe, expect, it } from 'vitest';
import { APP_LANGUAGE_OPTIONS, appLanguageTagFor } from './appLanguage';

describe('appLanguage', () => {
  it('lists the Android picker options in order', () => {
    expect(APP_LANGUAGE_OPTIONS).toEqual([
      'System',
      'English',
      'Español',
      'Français',
      'Deutsch',
      'Português',
      'Italiano',
    ]);
  });

  it('maps labels to BCP-47 tags; System and unknown mean no override', () => {
    expect(appLanguageTagFor('English')).toBe('en');
    expect(appLanguageTagFor('Español')).toBe('es');
    expect(appLanguageTagFor('Português')).toBe('pt');
    expect(appLanguageTagFor('System')).toBeNull();
    expect(appLanguageTagFor('Klingon')).toBeNull();
  });
});
