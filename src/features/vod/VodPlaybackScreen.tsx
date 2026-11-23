import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { VideoSurface } from '@/core/player';
import { useVodPlayback } from './useVodPlayback';
import type { VodPlaybackViewModel } from './vodPlaybackViewModel';
import { VodResumeScreen } from './VodResumeScreen';
import { VodTransportScreen } from './VodTransportScreen';

/**
 * The layers over the video surface (Android `VodPlaybackScreenLayers`):
 * while playing, the auto-hiding transport; while a stored position waits,
 * the Resume/Start-over step.
 */
function Layers({ viewModel }: { viewModel: VodPlaybackViewModel }): JSX.Element | null {
  const stage = viewModel.stage;
  if (stage.kind === 'ResumePrompt') {
    return <VodResumeScreen viewModel={viewModel} positionMs={stage.positionMs} />;
  }
  if (stage.kind === 'Playing' && viewModel.controls.transport.visible) {
    return <VodTransportScreen viewModel={viewModel} />;
  }
  return null;
}

/**
 * Fullscreen VOD playback with a seek transport (ux-spec §VOD, Android
 * `VodPlaybackScreen`): the screen owns its engine, the D-pad routes through
 * the ViewModel's controls, and BACK persists the resume position before
 * popping back to the Movies browser.
 */
export function VodPlaybackScreen({ itemKey }: { itemKey: string }): JSX.Element {
  const viewModel = useVodPlayback(itemKey);
  return (
    <FocusScope id="vod-playback" autoFocus={false} onBack={() => void viewModel?.exit()}>
      <div
        className="relative h-full w-full bg-black"
        data-testid="vod-playback"
        data-stage={viewModel?.stage.kind ?? 'Loading'}
      >
        {viewModel !== null && <VideoSurface engine={viewModel.engine} />}
        {viewModel !== null && <Layers viewModel={viewModel} />}
      </div>
    </FocusScope>
  );
}
