import { vi } from 'vitest';
import { ChannelRepository } from '@/core/db/channelRepository';
import { CustomGroupRepository } from '@/core/db/customGroupRepository';
import type { TellyDb } from '@/core/db/tellyDb';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import type { Route } from '@/core/navigation/routes';
import type { PlayerEngine } from '@/core/player';
import { ParentalControls } from '@/core/settings/parentalControls';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { createGroupToolStore } from '@/features/groups/groupToolStore';
import { GroupTools } from '@/features/groups/groupTools';
import { TuneController } from '@/features/playback/tune';
import { channelImport, freshDb } from '@/test/dbFixtures';
import { GuideController } from './guideController';
import type { GuideControllerDeps } from './guideWiring';
import { ORIGIN } from './testFixtures';

export interface Harness {
  controller: GuideController;
  deps: GuideControllerDeps;
  db: TellyDb;
  channels: ChannelRepository;
  engine: { load: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> };
  opened: Route[];
  fullscreen: ReturnType<typeof vi.fn>;
  seams: {
    toggleMyList: ReturnType<typeof vi.fn>;
    toggleReminder: ReturnType<typeof vi.fn>;
    openExternal: ReturnType<typeof vi.fn>;
  };
}

/** A guide controller over a fresh database with three seeded channels and a mock engine. */
export async function makeHarness(overrides: Partial<GuideControllerDeps> = {}): Promise<Harness> {
  const db = freshDb();
  const channels = new ChannelRepository(db);
  await channels.replaceForPlaylist(1, [
    channelImport('News One', { groupTitle: 'News' }),
    channelImport('News Two', { groupTitle: 'News' }),
    channelImport('Sports Arena', { groupTitle: 'Sports', tvgId: null }),
  ]);
  const engine = { load: vi.fn(), stop: vi.fn() };
  const store = new MemoryKeyValueStore();
  const settings = new SettingsRepository(new MemoryKeyValueStore());
  const parental = new ParentalControls(settings);
  const tuner = new TuneController({
    engine: engine as unknown as PlayerEngine,
    store,
    recordWatch: async () => undefined,
  });
  tuner.setChannels(await channels.visible());
  const opened: Route[] = [];
  const fullscreen = vi.fn();
  const seams = {
    toggleMyList: vi.fn(async () => undefined),
    toggleReminder: vi.fn(async () => undefined),
    openExternal: vi.fn(),
  };
  const deps: GuideControllerDeps = {
    tuner,
    store,
    settings,
    channels,
    parental,
    groupTools: new GroupTools(createGroupToolStore(new CustomGroupRepository(db), channels), parental),
    seams,
    now: () => ORIGIN + 60_000,
    open: (route) => opened.push(route),
    onFullscreen: fullscreen,
    tunesPreview: true,
    ...overrides,
  };
  return { controller: new GuideController(deps), deps, db, channels, engine, opened, fullscreen, seams };
}
