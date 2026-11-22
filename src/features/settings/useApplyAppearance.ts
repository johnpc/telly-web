import { useEffect } from 'react';
import { useSettingsRepository } from '@/core/settings/settingsContext';
import { observeAppearance } from './applyAppearance';

/** Keeps the document's accent / font scale / language in step with Settings -> Appearance. */
export function useApplyAppearance(): void {
  const settings = useSettingsRepository();
  useEffect(() => observeAppearance(settings), [settings]);
}
