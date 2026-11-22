import { type CustomGroupRepository, customGroupRepository } from '@/core/db/customGroupRepository';
import { ParentalControls } from '@/core/settings/parentalControls';
import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { type GuideQueryDeps, defaultGuideDeps } from '@/features/epg/useProgramsInRange';

/** The panel's cross-slice seams (Android `PanelHooks`): EPG lookups, custom groups, the parental gate, the clock. */
export interface PanelDeps {
  guide: GuideQueryDeps;
  customGroups: CustomGroupRepository;
  parental: (settings: SettingsRepository) => ParentalControls;
  now: () => number;
}

export const panelDeps: PanelDeps = {
  guide: defaultGuideDeps,
  customGroups: customGroupRepository,
  parental: (settings) => new ParentalControls(settings),
  now: () => Date.now(),
};
