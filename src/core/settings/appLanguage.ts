/**
 * Appearance -> Language: picker label -> BCP-47 tag (port of Android
 * `AppLanguage.kt`). "System" (the default) returns null, meaning no locale
 * override — the app follows the browser language.
 */
export const APP_LANGUAGE_OPTIONS: readonly string[] = [
  'System',
  'English',
  'Español',
  'Français',
  'Deutsch',
  'Português',
  'Italiano',
];

const TAGS: Readonly<Record<string, string>> = {
  English: 'en',
  Español: 'es',
  Français: 'fr',
  Deutsch: 'de',
  Português: 'pt',
  Italiano: 'it',
};

export function appLanguageTagFor(label: string): string | null {
  return TAGS[label] ?? null;
}
