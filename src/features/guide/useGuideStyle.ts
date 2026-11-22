import { useCallback, useSyncExternalStore } from 'react';
import { useSettingsRepository } from '@/core/settings/settingsContext';
import { type GuideStyle, guideStyleFrom } from './guideStyle';

/** Appearance -> TV guide, live (the guide keeps rendering while settings change). */
export function useGuideStyle(): GuideStyle {
  const settings = useSettingsRepository();
  const subscribe = useCallback((onChange: () => void) => settings.subscribeChanges(onChange), [settings]);
  const read = useCallback(() => JSON.stringify(guideStyleFrom(settings)), [settings]);
  return JSON.parse(useSyncExternalStore(subscribe, read, read)) as GuideStyle;
}
