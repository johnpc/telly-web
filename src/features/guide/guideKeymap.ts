import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';

/** Settings → Remote control → TV guide picker labels (Android `GuideKeymap`). */
export const LEFT_RIGHT_ACTIONS = ['Move by programme', 'Move by page'] as const;
export const CHANNEL_KEYS_ACTIONS = ['Nothing', 'Page the channel list', 'Move by day'] as const;
export const LONG_OK_ACTIONS = ['Open channel menu', 'Play channel'] as const;

export type GuideLeftRightAction = (typeof LEFT_RIGHT_ACTIONS)[number];
export type GuideChannelKeysAction = (typeof CHANNEL_KEYS_ACTIONS)[number];
export type GuideLongOkAction = (typeof LONG_OK_ACTIONS)[number];

export interface GuideKeymap {
  leftRight: GuideLeftRightAction;
  channelUpDown: GuideChannelKeysAction;
  longOk: GuideLongOkAction;
}

/** Every default equals the grid's base behaviour; remaps only ADD alternatives. */
export const DEFAULT_KEYMAP: GuideKeymap = {
  leftRight: 'Move by programme',
  channelUpDown: 'Nothing',
  longOk: 'Open channel menu',
};

function choice<T extends string>(raw: string, options: readonly T[], fallback: T): T {
  return options.find((o) => o === raw) ?? fallback;
}

/** Reads the three persisted picker labels (unknown values fall back to the defaults). */
export function keymapFrom(settings: SettingsRepository): GuideKeymap {
  return {
    leftRight: choice(
      settings.get(TellySettings.REMOTE_GUIDE_LEFT_RIGHT),
      LEFT_RIGHT_ACTIONS,
      DEFAULT_KEYMAP.leftRight,
    ),
    channelUpDown: choice(
      settings.get(TellySettings.REMOTE_GUIDE_CHANNEL_UP_DOWN),
      CHANNEL_KEYS_ACTIONS,
      DEFAULT_KEYMAP.channelUpDown,
    ),
    longOk: choice(settings.get(TellySettings.REMOTE_GUIDE_LONG_OK), LONG_OK_ACTIONS, DEFAULT_KEYMAP.longOk),
  };
}
