import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { programTitle } from '@/features/epg/nowNext';
import { BLOCK_PIN_TITLES } from '../gate/channelBlocker';
import { playbackGate } from '../gate/playbackGate';
import { PinPrompt } from '../gate/PinPromptScreen';
import { useChannelNow } from '../info/useChannelNow';
import { ChannelMenu } from '../menu/ChannelMenuScreen';
import { Description } from '../menu/DescriptionScreen';
import { menuSections } from '../menu/playerMenu';
import { BACK_TO_PANEL, popTo } from '../overlay/playbackCommands';
import type { PushedOverlay } from '../overlay/playbackOverlay';
import type { PlaybackController } from '../playbackController';
import { TrackPicker } from '../tracks/TrackPickerScreen';
import { applyPickerRow, pickerRows, type TrackSource } from '../tracks/trackPickerRows';
import { Message } from '../ui/MessageScreen';
import type { PlaybackSession } from '../tune/usePlaybackSession';
import type { PlaybackView } from './usePlaybackView';

interface LayerProps {
  ctl: PlaybackController;
  session: PlaybackSession;
  instant: number;
}

function Sheet({ channelId, ctl, session, instant }: LayerProps & { channelId: number }): JSX.Element | null {
  const channel = session.tuner.byId(channelId) ?? session.playing?.channel ?? null;
  const now = useChannelNow(channel, instant);
  if (channel === null) return null;
  return (
    <ChannelMenu
      sections={menuSections(now === null ? null : programTitle(now), channel.name)}
      state={{ favorite: channel.favorite, blocked: channel.blocked }}
      restore={ctl.menu.sheetFocus.restore}
      onItem={(item) => ctl.menu.onMenuItem(item)}
      onBack={() => ctl.commands.execute(BACK_TO_PANEL)}
    />
  );
}

/** The screens a sheet row pushes; BACK pops to the overlay behind them. */
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
      return (
        <FocusScope id="playback-description" trap onBack={back}>
          <Description channel={overlay.channel} instant={instant} />
        </FocusScope>
      );
    case 'ComingSoon':
      return (
        <FocusScope id="playback-coming-soon" trap onBack={back}>
          <Message headline={overlay.feature} subtitle="Coming soon to telly" />
        </FocusScope>
      );
    case 'BlockPin':
      return (
        <PinPrompt
          title={BLOCK_PIN_TITLES[overlay.mode]}
          keyboard={playbackGate.gate.keyboardPin}
          onSubmit={(pin) => void ctl.menu.submitBlockPin(pin)}
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
  }
}

/** The long-OK sheet and the screens its rows push, plus the quick-bar track pickers (Android `PlaybackScreenMenuLayers`). */
export function MenuLayers({
  view,
  ctl,
  session,
}: {
  view: PlaybackView;
  ctl: PlaybackController;
  session: PlaybackSession;
}): JSX.Element | null {
  const { overlay, source, instant } = view;
  if (overlay.kind === 'ChannelMenu')
    return <Sheet channelId={overlay.channelId} ctl={ctl} session={session} instant={instant} />;
  if ('back' in overlay)
    return <Pushed overlay={overlay} source={source} ctl={ctl} session={session} instant={instant} />;
  return null;
}
