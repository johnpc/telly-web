import { type ChannelRepository, channelRepository } from '@/core/db/channelRepository';
import type { KeyValueStore } from '@/core/kv/keyValueStore';
import { LocalStorageKeyValueStore } from '@/core/kv/localStorageKeyValueStore';
import type { Navigator } from '@/core/navigation/navigator';
import type { Route } from '@/core/navigation/routes';
import { ParentalControls } from '@/core/settings/parentalControls';
import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { createGroupToolStore } from '@/features/groups/groupToolStore';
import { GroupTools } from '@/features/groups/groupTools';
import type { TuneController } from '@/features/playback/tune';
import { GuideController } from './guideController';
import { type GuideSeams, createGuideSeams } from './guideSeams';

/** Everything the guide controller needs from the composition root (Android `GuideDeps` + `PlaybackEnv`). */
export interface GuideControllerDeps {
  tuner: TuneController;
  store: KeyValueStore;
  settings: SettingsRepository;
  channels: ChannelRepository;
  parental: ParentalControls;
  groupTools: GroupTools;
  seams: GuideSeams;
  now: () => number;
  /** Pushes a route (Search, Settings, My List, …). */
  open: (route: Route) => void;
  onFullscreen: () => void;
  /** False exactly once after a cold start with "last channel on start" off. */
  tunesPreview: boolean;
}

export interface GuideWiring {
  tuner: TuneController;
  settings: SettingsRepository;
  navigator: Navigator;
  tunesPreview: boolean;
}

/** The production controller over the app's repositories and `localStorage`. */
export function createGuideController(wiring: GuideWiring): GuideController {
  const parental = new ParentalControls(wiring.settings);
  return new GuideController({
    tuner: wiring.tuner,
    store: new LocalStorageKeyValueStore(),
    settings: wiring.settings,
    channels: channelRepository,
    parental,
    groupTools: new GroupTools(createGroupToolStore(), parental),
    seams: createGuideSeams(),
    now: () => Date.now(),
    open: (route) => wiring.navigator.push(route),
    onFullscreen: () => wiring.navigator.push({ kind: 'Playback' }),
    tunesPreview: wiring.tunesPreview,
  });
}
