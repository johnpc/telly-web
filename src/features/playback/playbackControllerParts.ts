import { channelRepository } from '@/core/db/channelRepository';
import type { ChannelRow } from '@/core/db/types';
import { ParentalControls } from '@/core/settings/parentalControls';
import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { ChannelOptionsController, SheetActions, externalDefaultOf } from '@/features/channelmenu';
import { createGroupToolStore } from '@/features/groups/groupToolStore';
import { GroupTools } from '@/features/groups/groupTools';
import { type PlaybackRecording, createPlaybackRecording } from '@/features/recording';
import type { BlockGate } from './gate/blockGate';
import type { PlaybackNavigation } from './menu/menuNavigation';
import { togglePanelMyList } from './menu/panelMyList';
import { PlaybackMenuHandler } from './menu/playbackMenuHandler';
import { overlayDialogHost } from './menu/playbackSheetHost';
import type { ControllerDeps } from './playbackController';
import type { OverlayState, OverlayTimers } from './overlay/overlayState';
import { panelTimeoutsForSeconds } from './overlay/panelTimeouts';
import { PlaybackCommands } from './overlay/playbackCommands';
import type { InstantStore } from './overlay/signal';
import type { TuneController } from './tune/tuneController';
import { NumberEntry } from './zap/numberEntry';

// The controller factory's building blocks, split out so each stays small.

export function buildCommands(
  tuner: TuneController,
  overlays: OverlayState,
  instant: InstantStore,
  nav: PlaybackNavigation,
  settings: SettingsRepository,
): PlaybackCommands {
  return new PlaybackCommands(tuner, overlays, {
    refreshInstant: () => instant.refresh(),
    exitToGuide: () => nav.exitToGuide(),
    timeouts: () => panelTimeoutsForSeconds(settings.get(TellySettings.PLAYER_PANEL_TIMEOUT_SEC)),
  });
}

/** After a tune request: the compact zap overlay, unless the blocked-channel gate is prompting instead. */
export function afterTune(gate: BlockGate, commands: PlaybackCommands): () => void {
  return () => {
    if (gate.prompt === null) commands.showZapInfo();
  };
}

/** OK on a recent card / number entry: tune and show the compact zap overlay (a gated tune prompts instead). */
export function panelTuner(
  tuner: TuneController,
  gate: BlockGate,
  commands: PlaybackCommands,
): (channel: ChannelRow) => void {
  const after = afterTune(gate, commands);
  return (channel) => {
    tuner.tune(channel);
    after();
  };
}

/** Digit entry commits to the visible channel carrying that number; unknown numbers change nothing. */
export function buildNumberEntry(
  tuner: Pick<TuneController, 'channels'>,
  tune: (channel: ChannelRow) => void,
  timers: OverlayTimers | undefined,
): NumberEntry {
  return new NumberEntry(
    (number) => {
      const target = tuner.channels.find((channel) => channel.number === number);
      if (target !== undefined) tune(target);
    },
    undefined,
    timers,
  );
}

/** The sheet handler over the shared channel-menu slice: flags, the Channel-options pane and the group tools. */
export function buildMenu(
  deps: Pick<ControllerDeps, 'actions' | 'parental' | 'settings' | 'nav'>,
  commands: PlaybackCommands,
  tuner: TuneController,
): { menu: PlaybackMenuHandler; record: PlaybackRecording } {
  const record = buildRecording(commands, tuner);
  const parental = deps.parental ?? new ParentalControls(deps.settings);
  const menu = new PlaybackMenuHandler({
    actions:
      deps.actions ?? new SheetActions(channelRepository, parental, (channel) => tuner.zapAwayFrom(channel)),
    options: new ChannelOptionsController(
      channelRepository,
      () => externalDefaultOf(deps.settings),
      overlayDialogHost(commands),
    ),
    groupTools: new GroupTools(createGroupToolStore(), parental),
    commands,
    tuner,
    nav: deps.nav,
    toggleMyList: (channel) => void togglePanelMyList(channel),
    record,
  });
  return { menu, record };
}

/** The DVR adapter: prompts become overlays through the one command executor. */
export function buildRecording(
  commands: PlaybackCommands,
  tuner: Pick<TuneController, 'current'>,
): PlaybackRecording {
  return createPlaybackRecording({
    show: (overlay) => commands.execute({ kind: 'Show', overlay }),
    overlay: () => commands.overlay,
    current: () => tuner.current,
  });
}
