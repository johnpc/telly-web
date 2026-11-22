import type { ChannelRow } from '@/core/db/types';
import type { BlockPinMode } from '../gate/channelBlocker';
import type { TrackPickerKind } from '../tracks/trackPickerKind';

/**
 * Which layer currently covers the fullscreen video (Android
 * `PlaybackOverlay`). EVERY write is a `PlaybackCommand` through the one
 * executor (`PlaybackCommands`); readers derive from `OverlayState.value`.
 */
// @stateMachine('Fullscreen overlay')
export type PlaybackOverlay =
  /** Bare playback: zero chrome. */
  | { kind: 'None' }
  /** Bottom info overlay with programme data + shortcut cards. */
  | { kind: 'Info' }
  /** Info overlay expanded with the transport row (second UP). */
  | { kind: 'InfoTransport' }
  /** Compact channel-change overlay while the new stream tunes. */
  | { kind: 'ZapInfo' }
  /** Bottom icon quick-bar from long-OK / MENU. */
  | { kind: 'QuickBar' }
  /** Channel list panel over the dimmed video. */
  | { kind: 'Panel' }
  /** Right-side sheet from long-OK on a panel row. */
  | { kind: 'ChannelMenu'; channelId: number }
  /** Branded placeholder for sheet rows whose slice is not built yet; BACK pops to `back`. */
  | { kind: 'ComingSoon'; feature: string; back: PlaybackOverlay }
  /** The sheet's "Program description": the airing programme's synopsis. */
  | { kind: 'Description'; channel: ChannelRow; back: PlaybackOverlay }
  /** The sheet's Block/Unblock PIN dialog; BACK cancels back to the sheet. */
  | { kind: 'BlockPin'; channel: ChannelRow; mode: BlockPinMode; back: PlaybackOverlay }
  /** Quick-bar track picker dialog (video / audio / audio-sync / CC). Sticky. */
  | { kind: 'TrackPicker'; picker: TrackPickerKind; back: PlaybackOverlay };

export type PushedOverlay = Extract<PlaybackOverlay, { back: PlaybackOverlay }>;

export const NONE: PlaybackOverlay = { kind: 'None' };
export const INFO: PlaybackOverlay = { kind: 'Info' };
export const INFO_TRANSPORT: PlaybackOverlay = { kind: 'InfoTransport' };
export const ZAP_INFO: PlaybackOverlay = { kind: 'ZapInfo' };
export const QUICK_BAR: PlaybackOverlay = { kind: 'QuickBar' };
export const PANEL: PlaybackOverlay = { kind: 'Panel' };

export function isPushed(overlay: PlaybackOverlay): overlay is PushedOverlay {
  return 'back' in overlay;
}

/** Overlays with an auto-hide countdown that D-pad browsing re-arms. */
export function isTransient(overlay: PlaybackOverlay): boolean {
  return (
    overlay.kind === 'Info' ||
    overlay.kind === 'InfoTransport' ||
    overlay.kind === 'ZapInfo' ||
    overlay.kind === 'QuickBar'
  );
}

/** Where number keys start a channel-number entry. */
export function acceptsDigits(overlay: PlaybackOverlay): boolean {
  return overlay.kind === 'None' || overlay.kind === 'ZapInfo' || overlay.kind === 'Info';
}

/** Where a row that dismisses the sheet lands: the panel behind the channel menu, bare playback otherwise. */
export function afterAction(current: PlaybackOverlay): PlaybackOverlay {
  return current.kind === 'ChannelMenu' ? PANEL : NONE;
}
