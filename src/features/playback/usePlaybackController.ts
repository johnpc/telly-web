import { useEffect, useMemo } from 'react';
import type { RemoteKey } from '@/core/input/remoteKeys';
import { useKeyHandler } from '@/core/input/useKeyHandler';
import { useNavigator } from '@/core/navigation/useNavigator';
import type { PlayerEngine } from '@/core/player';
import { useSettingsRepository } from '@/core/settings/settingsContext';
import { TellySettings } from '@/core/settings/tellySettings';
import { useSetting } from '@/core/settings/useSetting';
import { type PipState, sharedPipState } from '@/features/pip/pipState';
import { playbackGate } from './gate/playbackGate';
import { useVisibilitySuspend } from './lifecycle/useVisibilitySuspend';
import { playbackNavigationOf } from './menu/menuNavigation';
import { DISMISS } from './overlay/playbackCommands';
import { createPlaybackController, type PlaybackController } from './playbackController';
import { applyResizeMode } from './resizeModeSetting';
import type { PlaybackSession } from './tune/usePlaybackSession';
import { usePlaybackStart } from './usePlaybackStart';
import { type KeyBuffer, useReplayKeys } from './useStartupKeys';

/** PIP: mirror the element's window events; entering from ANY path drops the overlay. */
function usePipWiring(engine: PlayerEngine, pip: PipState, ctl: PlaybackController): void {
  useEffect(() => (engine.video === null ? undefined : pip.attach(engine.video)), [engine, pip]);
  useEffect(
    () =>
      pip.subscribe(() => {
        if (pip.inPip) ctl.commands.execute(DISMISS);
      }),
    [pip, ctl],
  );
}

/** Settings → Playback → Resize mode reaches the fullscreen surface live. */
function useResizeMode(engine: PlayerEngine): void {
  const [raw] = useSetting(TellySettings.RESIZE_MODE);
  useEffect(() => applyResizeMode(engine, raw), [engine, raw]);
}

/**
 * Assembles the fullscreen-playback controller for the screen's lifetime and
 * wires it to the key router, page visibility, PIP and the cold-start tune.
 */
const NO_KEYS: KeyBuffer = { current: [] };

export function usePlaybackController(
  session: PlaybackSession,
  pip: PipState = sharedPipState,
  heldKeys: KeyBuffer = NO_KEYS,
): PlaybackController {
  const navigator = useNavigator();
  const settings = useSettingsRepository();
  const { tuner, engine } = session;
  const ctl = useMemo(
    () =>
      createPlaybackController({
        tuner,
        engine,
        gate: playbackGate.gate,
        parental: playbackGate.parental,
        nav: playbackNavigationOf(navigator),
        settings,
        pip,
      }),
    [tuner, engine, navigator, settings, pip],
  );
  useKeyHandler((key: RemoteKey) => ctl.onKey(key));
  useVisibilitySuspend(ctl.lifecycle);
  usePlaybackStart(tuner, session.channels, () => ctl.catchup.resumePending());
  useEffect(() => ctl.catchup.watch(), [ctl]);
  useReplayKeys(heldKeys, session.channels.length > 0, ctl.onKey);
  usePipWiring(engine, pip, ctl);
  useResizeMode(engine);
  return ctl;
}
