import { type VodRepository, vodRepository } from '@/core/db/vodRepository';
import { createEngine, createVideoElement, type PlayerEngine } from '@/core/player';
import { defaultSettingsRepository } from '@/core/settings/settingsContext';
import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import type { VodPositionDao } from './vodPositionStore';

export type VodItemSource = Pick<VodRepository, 'items' | 'itemByKey'>;
export type VodPositionSource = VodPositionDao & Pick<VodRepository, 'positions'>;

/**
 * Everything the VOD slice needs from the composition root (Android
 * `VodDeps`). The engine comes as a factory so each playback visit gets a
 * fresh engine of its OWN (never the shared live-TV lease) that is released
 * when the screen leaves; `rememberPosition` reads the Settings -> Other ->
 * VOD toggle live and `transportTimeoutMs` the Appearance player timeout.
 */
export interface VodDeps {
  items: VodItemSource;
  positions: VodPositionSource;
  engineFactory: () => PlayerEngine;
  rememberPosition: () => boolean;
  transportTimeoutMs: () => number;
  clock: () => number;
}

const SECOND_MS = 1000;

/** A fresh, attached engine for one VOD visit. */
export function createVodEngine(): PlayerEngine {
  const engine = createEngine();
  engine.attach(createVideoElement());
  return engine;
}

export function createVodDeps(
  settings: SettingsRepository = defaultSettingsRepository,
  repository: VodRepository = vodRepository,
  engineFactory: () => PlayerEngine = createVodEngine,
): VodDeps {
  return {
    items: repository,
    positions: repository,
    engineFactory,
    rememberPosition: () => settings.get(TellySettings.VOD_REMEMBER_POSITION),
    transportTimeoutMs: () => settings.get(TellySettings.PLAYER_PANEL_TIMEOUT_SEC) * SECOND_MS,
    clock: () => Date.now(),
  };
}

export const defaultVodDeps: VodDeps = createVodDeps();
