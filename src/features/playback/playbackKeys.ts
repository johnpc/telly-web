import { isDigit, type RemoteKey } from '@/core/input/remoteKeys';
import { KEEP_ALIVE, type PlaybackCommands } from './overlay/playbackCommands';
import { acceptsDigits, isTransient } from './overlay/playbackOverlay';
import { commandFor } from './overlay/playbackKeyPolicy';
import type { PlayerKeymap } from './overlay/playerKeymap';
import type { NumberEntry } from './zap/numberEntry';

export interface KeyContext {
  commands: PlaybackCommands;
  entry: NumberEntry;
  keymap: () => PlayerKeymap;
  /** The blocked-channel PIN card is up: it owns every key. */
  promptOpen: () => boolean;
}

/**
 * Routes one remote key through the catalogue's key-by-context map; true =
 * consumed. Any key inside a transient overlay re-arms its auto-hide; digit
 * keys feed the channel-number entry where bare playback owns them.
 */
export function routeKey(ctx: KeyContext, key: RemoteKey): boolean {
  if (ctx.promptOpen()) return true;
  const overlay = ctx.commands.overlay;
  if (isTransient(overlay)) ctx.commands.execute(KEEP_ALIVE);
  if (isDigit(key)) {
    if (!acceptsDigits(overlay)) return false;
    ctx.entry.push(key.digit);
    return true;
  }
  if (ctx.entry.digits !== null && (key === 'OK' || key === 'BACK')) {
    if (key === 'OK') ctx.entry.commit();
    else ctx.entry.cancel();
    return true;
  }
  const command = commandFor(overlay, key, ctx.keymap());
  if (command === null) return false;
  ctx.commands.execute(command);
  return true;
}
