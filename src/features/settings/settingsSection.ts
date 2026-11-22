/**
 * The settings sections, in the exact captured order (catalogue §6, dump 18;
 * port of Android `SettingsSection.kt`). The reference lists an "Unlock
 * Premium" row above these; telly has no premium tier, so it is dropped.
 */
export type SettingsSectionId =
  | 'GENERAL'
  | 'PLAYLISTS'
  | 'EPG'
  | 'APPEARANCE'
  | 'PLAYBACK'
  | 'REMOTE_CONTROL'
  | 'PARENTAL_CONTROLS'
  | 'OTHER'
  | 'ABOUT';

export interface SettingsSection {
  id: SettingsSectionId;
  title: string;
}

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { id: 'GENERAL', title: 'General' },
  { id: 'PLAYLISTS', title: 'Playlists' },
  { id: 'EPG', title: 'EPG' },
  { id: 'APPEARANCE', title: 'Appearance' },
  { id: 'PLAYBACK', title: 'Playback' },
  { id: 'REMOTE_CONTROL', title: 'Remote control' },
  { id: 'PARENTAL_CONTROLS', title: 'Parental controls' },
  { id: 'OTHER', title: 'Other' },
  { id: 'ABOUT', title: 'About' },
];

export function sectionTitle(id: SettingsSectionId): string {
  return SETTINGS_SECTIONS.find((section) => section.id === id)?.title ?? id;
}

export function isSectionId(raw: string): raw is SettingsSectionId {
  return SETTINGS_SECTIONS.some((section) => section.id === raw);
}
