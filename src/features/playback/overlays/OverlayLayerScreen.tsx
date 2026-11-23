import type { JSX } from 'react';
import { watchHistoryRepository } from '@/core/db/watchHistoryRepository';
import { CatchupTicker, useTransportCatchup } from '@/features/catchup';
import { InfoOverlay } from '../info/InfoOverlayScreen';
import { KEEP_ALIVE, show } from '../overlay/playbackCommands';
import type { PlaybackController } from '../playbackController';
import { QuickBar } from '../quickbar/QuickBarScreen';
import { quickBarItems } from '../quickbar/quickBar';
import { onQuickBarAction } from '../quickbar/quickBarActions';
import { TrackLabels } from '../tracks/trackLabels';
import type { PlaybackSession } from '../tune/usePlaybackSession';
import { ZapOverlay } from '../zap/ZapOverlayScreen';
import { PanelHost } from './PanelHost';
import type { PlaybackView } from './usePlaybackView';

interface LayerProps {
  view: PlaybackView;
  ctl: PlaybackController;
  session: PlaybackSession;
}

function InfoLayer({ view, ctl, session }: LayerProps): JSX.Element | null {
  const catchup = useTransportCatchup(ctl.catchup, session.engine);
  if (view.info === null) return null;
  const transport = view.overlay.kind === 'InfoTransport';
  return (
    <>
      <InfoOverlay
        data={view.info}
        recents={view.recents}
        style={view.panelStyle}
        transport={transport}
        catchup={catchup}
        actions={{
          onGuide: () => ctl.nav.exitToGuide(),
          onHistory: () => ctl.nav.openHistory(),
          onMultiview: () => ctl.nav.openMultiview(),
          onRecent: (card) => ctl.tuneFromPanel(card.channel),
          onClear: () => {
            void watchHistoryRepository.clear();
            ctl.commands.execute(KEEP_ALIVE);
          },
        }}
        onFeature={(feature) => {
          if (feature === 'Record') return ctl.record.toggle();
          ctl.commands.execute(show({ kind: 'ComingSoon', feature, back: { kind: 'None' } }));
        }}
      />
      {catchup !== null && <CatchupTicker catchup={ctl.catchup} transport={transport} />}
    </>
  );
}

function QuickBarLayer({ view, ctl, session }: LayerProps): JSX.Element {
  const { details, source } = view;
  return (
    <QuickBar
      items={quickBarItems(
        details,
        TrackLabels.sync(source.audioSyncMs),
        TrackLabels.subtitleSlot(source.tracks),
      )}
      info={view.info}
      style={view.panelStyle}
      onAction={(action) => onQuickBarAction(ctl, session.engine, action)}
    />
  );
}

/** The transient overlays and the panel, by overlay kind; the sheet and pushed screens live in `MenuLayers`. */
export function OverlayLayer({ view, ctl, session }: LayerProps): JSX.Element | null {
  switch (view.overlay.kind) {
    case 'Info':
    case 'InfoTransport':
      return <InfoLayer view={view} ctl={ctl} session={session} />;
    case 'ZapInfo':
      return view.info === null ? null : <ZapOverlay data={view.info} style={view.panelStyle} />;
    case 'Panel':
    case 'ChannelMenu':
      return <PanelHost session={session} ctl={ctl} />;
    case 'QuickBar':
      return <QuickBarLayer view={view} ctl={ctl} session={session} />;
    default:
      return null;
  }
}
