import type { SimpleRemoteKey } from './remoteKeys';

/**
 * Xbox: Edge / WebView2 turns the controller into keyboard events whose `key`
 * is a `Gamepad*` name (the D-pad and left stick also arrive as plain arrows
 * when the browser is in its default mode). A → OK, B → BACK, X → play/pause,
 * bumpers → CH−/CH+, triggers → RW/FF, Menu and View → MENU. Y is left free.
 */
export const GAMEPAD_KEY_TABLE: Readonly<Record<string, SimpleRemoteKey>> = {
  GamepadA: 'OK',
  GamepadB: 'BACK',
  GamepadX: 'PLAY_PAUSE',
  GamepadDPadUp: 'UP',
  GamepadDPadDown: 'DOWN',
  GamepadDPadLeft: 'LEFT',
  GamepadDPadRight: 'RIGHT',
  GamepadLeftThumbstickUp: 'UP',
  GamepadLeftThumbstickDown: 'DOWN',
  GamepadLeftThumbstickLeft: 'LEFT',
  GamepadLeftThumbstickRight: 'RIGHT',
  GamepadLeftShoulder: 'CHANNEL_DOWN',
  GamepadRightShoulder: 'CHANNEL_UP',
  GamepadMenu: 'MENU',
  GamepadView: 'MENU',
  GamepadLeftTrigger: 'REWIND',
  GamepadRightTrigger: 'FAST_FORWARD',
};
