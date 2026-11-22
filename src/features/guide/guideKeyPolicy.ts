import type { RemoteKey } from '@/core/input/remoteKeys';
import type { GuideKeymap } from './guideKeymap';
import type { GuideLayer } from './guideLayer';

/** D-pad keys the guide reacts to (Android `GuideKey`). */
export type GuideKey =
  | 'OK'
  | 'LONG_OK'
  | 'MENU'
  | 'BACK'
  | 'UP'
  | 'DOWN'
  | 'LEFT'
  | 'RIGHT'
  | 'LONG_LEFT'
  | 'LONG_RIGHT'
  | 'CHANNEL_UP'
  | 'CHANNEL_DOWN';

/**
 * Remote → guide key. Web deviation: arrows auto-repeat in browsers, so a
 * held LEFT/RIGHT cannot become a hold; REWIND / FAST_FORWARD carry the day
 * jumps instead (TiviMate's ux-spec lists RW/FF as guide paging keys).
 */
export function guideKeyOf(key: RemoteKey): GuideKey | null {
  if (typeof key === 'object') return null;
  if (key === 'REWIND') return 'LONG_LEFT';
  if (key === 'FAST_FORWARD') return 'LONG_RIGHT';
  return key === 'PLAY_PAUSE' ? null : key;
}

/** What a key press should do given the active guide layer. */
export type GuideCommand =
  | { kind: 'FocusLeft' }
  | { kind: 'FocusRight' }
  | { kind: 'FocusUp' }
  | { kind: 'FocusDown' }
  | { kind: 'Activate' }
  | { kind: 'DayJump'; days: number }
  | { kind: 'PageJump'; direction: number }
  | { kind: 'PageRows'; direction: number }
  | { kind: 'OpenRowMenu' }
  | { kind: 'OpenCellMenu' }
  | { kind: 'OpenGroups' }
  | { kind: 'CloseLayer' };

const DAY = 1;

function horizontal(keymap: GuideKeymap, direction: number): GuideCommand {
  if (keymap.leftRight === 'Move by page') return { kind: 'PageJump', direction };
  return { kind: direction < 0 ? 'FocusLeft' : 'FocusRight' };
}

/** CH+ pages up the list / jumps a day forward; CH− mirrors it. */
function channelKeys(keymap: GuideKeymap, up: boolean): GuideCommand | null {
  if (keymap.channelUpDown === 'Page the channel list') return { kind: 'PageRows', direction: up ? -1 : 1 };
  if (keymap.channelUpDown === 'Move by day') return { kind: 'DayJump', days: up ? DAY : -DAY };
  return null;
}

const GRID_KEYS: Readonly<Partial<Record<GuideKey, GuideCommand>>> = {
  UP: { kind: 'FocusUp' },
  DOWN: { kind: 'FocusDown' },
  OK: { kind: 'Activate' },
  MENU: { kind: 'OpenRowMenu' },
  LONG_LEFT: { kind: 'DayJump', days: -DAY },
  LONG_RIGHT: { kind: 'DayJump', days: DAY },
  BACK: { kind: 'OpenGroups' },
};

function onGrid(key: GuideKey, keymap: GuideKeymap): GuideCommand | null {
  if (key === 'LEFT' || key === 'RIGHT') return horizontal(keymap, key === 'LEFT' ? -1 : 1);
  if (key === 'LONG_OK') return { kind: keymap.longOk === 'Play channel' ? 'Activate' : 'OpenCellMenu' };
  if (key === 'CHANNEL_UP' || key === 'CHANNEL_DOWN') return channelKeys(keymap, key === 'CHANNEL_UP');
  return GRID_KEYS[key] ?? null;
}

/**
 * Key-by-layer map (Android `GuideKeyPolicy`): the grid moves focus, OK
 * plays, long-OK opens the cell dropdown, MENU the row sheet, BACK the
 * groups column. The groups column closes on RIGHT (its BACK is spatial:
 * gear, then exit); every other layer closes one level on BACK.
 */
// @stateMachine('Guide keys')
export function commandFor(layer: GuideLayer, key: GuideKey, keymap: GuideKeymap): GuideCommand | null {
  if (layer.kind === 'Grid') return onGrid(key, keymap);
  const closer: GuideKey = layer.kind === 'Groups' ? 'RIGHT' : 'BACK';
  return key === closer ? { kind: 'CloseLayer' } : null;
}
