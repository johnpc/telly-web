import type { ChannelRow } from '@/core/db/types';
import type { RemoteKey } from '@/core/input/remoteKeys';
import type { PlayerEngine } from '@/core/player';
import type { ParentalControls } from '@/core/settings/parentalControls';
import type { SettingsRepository } from '@/core/settings/settingsRepository';
import type { PipState } from '@/features/pip/pipState';
import type { BlockGate } from './gate/blockGate';
import { TuneBlockPrompt } from './gate/tuneBlockPrompt';
import { PlaybackLifecycle } from './lifecycle/playbackLifecycle';
import { channelActions } from './menu/channelActions';
import type { PlaybackNavigation } from './menu/menuNavigation';
import type { FlagActions, PlaybackMenuHandler } from './menu/playbackMenuHandler';
import { OverlayState, type OverlayTimers } from './overlay/overlayState';
import type { PlaybackCommands } from './overlay/playbackCommands';
import { playerKeymapOf } from './overlay/playerKeymap';
import { InstantStore, Signal } from './overlay/signal';
import { afterTune, buildCommands, buildMenu, buildNumberEntry, panelTuner } from './playbackControllerParts';
import { routeKey } from './playbackKeys';
import type { TuneController } from './tune/tuneController';
import type { NumberEntry } from './zap/numberEntry';

export interface ControllerDeps {
  tuner: TuneController;
  engine: PlayerEngine;
  gate: BlockGate;
  parental: ParentalControls | null;
  nav: PlaybackNavigation;
  settings: SettingsRepository;
  pip: PipState;
  actions?: FlagActions;
  timers?: OverlayTimers;
  clock?: () => number;
}

/** The fullscreen-playback state machine's parts, assembled once per screen mount (Android `PlaybackViewModel`). */
export interface PlaybackController {
  readonly overlays: OverlayState;
  readonly commands: PlaybackCommands;
  readonly menu: PlaybackMenuHandler;
  readonly prompt: TuneBlockPrompt;
  readonly entry: NumberEntry;
  readonly lifecycle: PlaybackLifecycle;
  readonly instant: InstantStore;
  /** Bumped after an engine write the engine does not announce itself (audio sync). */
  readonly tracksChanged: Signal;
  readonly nav: PlaybackNavigation;
  onKey(key: RemoteKey): boolean;
  /** OK on a recent card / number entry: tune and show the compact zap overlay (a gated tune prompts instead). */
  tuneFromPanel(channel: ChannelRow): void;
  /** The panel already tuned: show the zap overlay unless the gate is prompting. */
  onPanelTuned(): void;
  openChannelMenu(channel: ChannelRow): void;
}

export function createPlaybackController(deps: ControllerDeps): PlaybackController {
  const { tuner, gate, nav, settings } = deps;
  const overlays = new OverlayState(deps.timers);
  const instant = new InstantStore(deps.clock);
  const commands = buildCommands(tuner, overlays, instant, nav, settings);
  const tuneFromPanel = panelTuner(tuner, gate, commands);
  const entry = buildNumberEntry(tuner, tuneFromPanel, deps.timers);
  const menu = buildMenu(deps.actions ?? channelActions, deps.parental, commands, tuner, nav);
  const keys = {
    commands,
    entry,
    keymap: () => playerKeymapOf(settings),
    promptOpen: () => gate.prompt !== null,
  };
  return {
    overlays,
    commands,
    menu,
    prompt: new TuneBlockPrompt(
      gate,
      (channel) => tuner.tune(channel),
      () => commands.showZapInfo(),
    ),
    entry,
    lifecycle: new PlaybackLifecycle(tuner, deps.engine, () => deps.pip.allowsBackgroundStop()),
    instant,
    tracksChanged: new Signal(),
    nav,
    onKey: (key) => routeKey(keys, key),
    tuneFromPanel,
    onPanelTuned: afterTune(gate, commands),
    openChannelMenu: (channel) => menu.openChannelMenu(channel.id),
  };
}
