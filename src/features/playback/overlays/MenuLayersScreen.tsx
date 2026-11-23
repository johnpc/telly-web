import type { JSX } from 'react';
import { COMING_SOON, ChannelOptionsScreen, MessageScreen } from '@/features/channelmenu';
import { GroupToolScreen } from '@/features/groups/GroupToolScreen';
import { recordingLayer } from '@/features/recording';
import { playbackGate } from '../gate/playbackGate';
import { PinPrompt } from '../gate/PinPromptScreen';
import { Description } from '../menu/DescriptionScreen';
import { popTo } from '../overlay/playbackCommands';
import type { PushedOverlay } from '../overlay/playbackOverlay';
import type { PlaybackController } from '../playbackController';
import { TrackPicker } from '../tracks/TrackPickerScreen';
import { applyPickerRow, pickerRows, type TrackSource } from '../tracks/trackPickerRows';
import type { PlaybackSession } from '../tune/usePlaybackSession';
import { SheetLayer } from './SheetLayerScreen';
import type { PlaybackView } from './usePlaybackView';

interface LayerProps {
  ctl: PlaybackController;
  session: PlaybackSession;
  instant: number;
}

/** The screens a sheet row pushes (shared with the guide); BACK pops to the overlay behind them. */
function Pushed({
  overlay,
  ctl,
  session,
  instant,
  source,
}: LayerProps & { overlay: PushedOverlay; source: TrackSource }): JSX.Element {
  const back = (): void => ctl.commands.execute(popTo(overlay.back));
  switch (overlay.kind) {
    case 'Description':
      return <Description channel={overlay.channel} instant={instant} />;
    case 'ComingSoon':
      return <MessageScreen headline={overlay.feature} subtitle={COMING_SOON} testId="coming-soon" />;
    case 'ChannelOptions':
      return (
        <ChannelOptionsScreen
          channelId={overlay.channelId}
          options={ctl.menu.options}
          onRow={(channel, rowId) => ctl.menu.onChannelOption(channel, rowId)}
          onBack={() => ctl.menu.closeChannelOptions()}
        />
      );
    case 'GroupTool':
      return <GroupToolScreen session={overlay.session} />;
    case 'BlockPin':
      return (
        <PinPrompt
          title={overlay.mode}
          keyboard={playbackGate.gate.keyboardPin}
          onSubmit={(pin) => ctl.menu.submitBlockPin(pin)}
          onDismiss={back}
        />
      );
    case 'TrackPicker':
      return (
        <TrackPicker
          kind={overlay.picker}
          rows={pickerRows(overlay.picker, source)}
          source={source}
          delayOnly={session.engine.audioSyncSupport === 'delay-only'}
          onRow={(rowId) => {
            if (applyPickerRow(overlay.picker, rowId, session.engine)) back();
            ctl.tracksChanged.notify();
          }}
          onBack={back}
        />
      );
    default:
      return recordingLayer(overlay, ctl.record, back);
  }
}

/** The long-OK sheet and the screens its rows push, plus the quick-bar track pickers (Android `PlaybackScreenMenuLayers`). */
export function MenuLayers({
  view,
  ctl,
  session,
}: Omit<LayerProps, 'instant'> & { view: PlaybackView }): JSX.Element | null {
  const { overlay, source, instant } = view;
  if (overlay.kind === 'ChannelMenu')
    return <SheetLayer channelId={overlay.channelId} ctl={ctl} session={session} instant={instant} />;
  if ('back' in overlay)
    return <Pushed overlay={overlay} source={source} ctl={ctl} session={session} instant={instant} />;
  return null;
}
