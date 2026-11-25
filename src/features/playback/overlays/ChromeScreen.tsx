import type { JSX } from 'react';
import { playbackGate } from '../gate/playbackGate';
import { PinPrompt } from '../gate/PinPromptScreen';
import type { PlaybackController } from '../playbackController';
import type { PlaybackSession } from '../tune/usePlaybackSession';
import { NumberEntryPill, ReconnectingPill } from '../zap/ZapOverlayScreen';
import { MenuLayers } from './MenuLayersScreen';
import { OverlayLayer } from './OverlayLayerScreen';
import { chromeAttrs, type PlaybackView, usePlaybackView } from './usePlaybackView';
import { ZapWait } from './ZapWaitScreen';

/** The number-entry pill, the reconnecting pill and the tune-gate PIN card, over whatever overlay is up. */
function Pills({ view, ctl }: { view: PlaybackView; ctl: PlaybackController }): JSX.Element {
  return (
    <>
      {view.digits !== null && <NumberEntryPill digits={view.digits} />}
      {view.state.kind === 'Reconnecting' && <ReconnectingPill />}
      {view.prompt !== null && (
        <PinPrompt
          title="Enter PIN"
          keyboard={playbackGate.gate.keyboardPin}
          onSubmit={(pin) => ctl.prompt.submit(pin)}
          onDismiss={() => ctl.prompt.dismiss()}
        />
      )}
    </>
  );
}

/** Everything over the video surface: the zap wait (lowest), the active overlay, the sheet layers and the pills. */
export function Chrome({ session, ctl }: { session: PlaybackSession; ctl: PlaybackController }): JSX.Element {
  const view = usePlaybackView(session, ctl);
  return (
    <div className="absolute inset-0" {...chromeAttrs(view)}>
      <ZapWait view={view.zapWait} />
      <OverlayLayer view={view} ctl={ctl} session={session} />
      <MenuLayers view={view} ctl={ctl} session={session} />
      <Pills view={view} ctl={ctl} />
    </div>
  );
}
