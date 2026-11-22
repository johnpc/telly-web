import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { OPEN_PANEL, OPEN_QUICK_BAR, SHOW_INFO, zap, type PlaybackCommand } from './playbackCommands';

/** Picker labels are the stored raw values (Settings → Remote control → Player). */
export const OK_ACTIONS = ['Show info panel', 'Open channels list', 'Nothing'] as const;
export const UP_DOWN_ACTIONS = ['Show info panel', 'Switch channels', 'Nothing'] as const;
export const LEFT_RIGHT_ACTIONS = ['Nothing', 'Switch channels'] as const;
export const LONG_OK_ACTIONS = ['Open quick menu', 'Open channels list'] as const;

export type PlayerOkAction = (typeof OK_ACTIONS)[number];
export type PlayerUpDownAction = (typeof UP_DOWN_ACTIONS)[number];
export type PlayerLeftRightAction = (typeof LEFT_RIGHT_ACTIONS)[number];
export type PlayerLongOkAction = (typeof LONG_OK_ACTIONS)[number];

/** The remappable fullscreen-playback keys; every default equals the device-verified key map. */
export interface PlayerKeymap {
  ok: PlayerOkAction;
  upDown: PlayerUpDownAction;
  leftRight: PlayerLeftRightAction;
  longOk: PlayerLongOkAction;
}

export const DEFAULT_KEYMAP: PlayerKeymap = {
  ok: 'Show info panel',
  upDown: 'Show info panel',
  leftRight: 'Nothing',
  longOk: 'Open quick menu',
};

/** Parses a persisted picker label; unknown raws fall back to `fallback`. */
export function keymapChoice<T extends string>(raw: string, options: readonly T[], fallback: T): T {
  return options.find((option) => option === raw) ?? fallback;
}

/** Reads the four persisted picker labels. */
export function playerKeymapOf(settings: SettingsRepository): PlayerKeymap {
  return {
    ok: keymapChoice(settings.get(TellySettings.REMOTE_PLAYER_OK), OK_ACTIONS, DEFAULT_KEYMAP.ok),
    upDown: keymapChoice(
      settings.get(TellySettings.REMOTE_PLAYER_UP_DOWN),
      UP_DOWN_ACTIONS,
      DEFAULT_KEYMAP.upDown,
    ),
    leftRight: keymapChoice(
      settings.get(TellySettings.REMOTE_PLAYER_LEFT_RIGHT),
      LEFT_RIGHT_ACTIONS,
      DEFAULT_KEYMAP.leftRight,
    ),
    longOk: keymapChoice(
      settings.get(TellySettings.REMOTE_PLAYER_LONG_OK),
      LONG_OK_ACTIONS,
      DEFAULT_KEYMAP.longOk,
    ),
  };
}

export function okCommand(keymap: PlayerKeymap): PlaybackCommand | null {
  if (keymap.ok === 'Show info panel') return SHOW_INFO;
  return keymap.ok === 'Open channels list' ? OPEN_PANEL : null;
}

/** UP zaps forward, DOWN back, mirroring CH+/CH− (null = key does nothing). */
export function upDownCommand(keymap: PlayerKeymap, delta: number): PlaybackCommand | null {
  if (keymap.upDown === 'Show info panel') return SHOW_INFO;
  return keymap.upDown === 'Switch channels' ? zap(delta) : null;
}

/** RIGHT zaps forward, LEFT back (null = key does nothing). */
export function leftRightCommand(keymap: PlayerKeymap, delta: number): PlaybackCommand | null {
  return keymap.leftRight === 'Switch channels' ? zap(delta) : null;
}

export function longOkCommand(keymap: PlayerKeymap): PlaybackCommand {
  return keymap.longOk === 'Open quick menu' ? OPEN_QUICK_BAR : OPEN_PANEL;
}
