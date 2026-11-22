import type { SimpleRemoteKey } from '@/core/input/remoteKeys';
import {
  BACK_TO_PANEL,
  DISMISS,
  EXIT_TO_GUIDE,
  OPEN_PANEL,
  OPEN_QUICK_BAR,
  SHOW_INFO,
  SHOW_TRANSPORT,
  popTo,
  zap,
  type PlaybackCommand,
} from './playbackCommands';
import {
  DEFAULT_KEYMAP,
  leftRightCommand,
  longOkCommand,
  okCommand,
  upDownCommand,
  type PlayerKeymap,
} from './playerKeymap';
import { isPushed, type PlaybackOverlay } from './playbackOverlay';

type KeyTable = Partial<Record<SimpleRemoteKey, (keymap: PlayerKeymap) => PlaybackCommand | null>>;

/** CH+/CH− zap in every overlay that has no sticky focus; RW/FF belong to catch-up. */
const ZAPS: KeyTable = { CHANNEL_UP: () => zap(+1), CHANNEL_DOWN: () => zap(-1) };

/** The remappable bare-playback keys (Settings → Remote control → Player). */
const REMAPPED: KeyTable = {
  OK: okCommand,
  UP: (k) => upDownCommand(k, +1),
  DOWN: (k) => upDownCommand(k, -1),
  LEFT: (k) => leftRightCommand(k, -1),
  RIGHT: (k) => leftRightCommand(k, +1),
  LONG_OK: longOkCommand,
};

const BARE: KeyTable = { ...ZAPS, ...REMAPPED, MENU: () => OPEN_QUICK_BAR, BACK: () => EXIT_TO_GUIDE };

/**
 * The shortcut-card row's down chevron promises "more below": DOWN opens the
 * channel list panel; BACK dismisses; long-OK/MENU open the quick-bar;
 * OK/LEFT/RIGHT stay with the focused card.
 */
const WITHIN_INFO: KeyTable = {
  ...ZAPS,
  BACK: () => DISMISS,
  DOWN: () => OPEN_PANEL,
  LONG_OK: () => OPEN_QUICK_BAR,
  MENU: () => OPEN_QUICK_BAR,
};

/** Any info key promotes the zap overlay to the full info overlay; remapped keys keep their meaning. */
const WITHIN_ZAP: KeyTable = {
  ...WITHIN_INFO,
  ...REMAPPED,
  OK: (k) => okCommand(k) ?? SHOW_INFO,
  UP: (k) => upDownCommand(k, +1) ?? SHOW_INFO,
  DOWN: (k) => upDownCommand(k, -1) ?? SHOW_INFO,
};

function lookup(table: KeyTable, key: SimpleRemoteKey, keymap: PlayerKeymap): PlaybackCommand | null {
  return table[key]?.(keymap) ?? null;
}

/**
 * Key-by-context map, device-verified (Android `PlaybackKeyPolicy`): OK/DOWN
 * and UP open the info overlay; a second UP expands the transport row;
 * long-OK/MENU open the quick-bar; LEFT/RIGHT do nothing at bare playback;
 * CH+/CH− zap directly; BACK at bare playback returns to the TV guide.
 * Sticky overlays (panel, sheet, pushed screens) take BACK only.
 */
export function commandFor(
  overlay: PlaybackOverlay,
  key: SimpleRemoteKey,
  keymap: PlayerKeymap = DEFAULT_KEYMAP,
): PlaybackCommand | null {
  switch (overlay.kind) {
    case 'None':
      return lookup(BARE, key, keymap);
    case 'Info':
      return key === 'UP' ? SHOW_TRANSPORT : lookup(WITHIN_INFO, key, keymap);
    case 'InfoTransport':
      return lookup(WITHIN_INFO, key, keymap);
    case 'ZapInfo':
      return lookup(WITHIN_ZAP, key, keymap);
    case 'ChannelMenu':
      return key === 'BACK' ? BACK_TO_PANEL : null;
    default:
      if (key !== 'BACK') return null;
      return isPushed(overlay) ? popTo(overlay.back) : DISMISS;
  }
}
