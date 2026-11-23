import { useEffect, useMemo, useState } from 'react';
import type { RemoteKey } from '@/core/input/remoteKeys';
import { KeyQueue } from '@/core/input/keyQueue';
import { useKeyHandler } from '@/core/input/useKeyHandler';
import { useHoldKeys, useReplayHeldKeys } from '@/core/input/useKeyQueue';
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
export function usePlaybackController(
  session: PlaybackSession,
  pip: PipState = sharedPipState,
  heldKeys?: KeyQueue,
): PlaybackController {
  const [queue] = useState(() => heldKeys ?? new KeyQueue());
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
  useHoldKeys(queue);
  useReplayHeldKeys(queue, session.channels.length > 0);
  useVisibilitySuspend(ctl.lifecycle);
  usePlaybackStart(tuner, session.channels, () => ctl.catchup.resumePending());
  useEffect(() => ctl.catchup.watch(), [ctl]);
  usePipWiring(engine, pip, ctl);
  useResizeMode(engine);
  return ctl;
}
