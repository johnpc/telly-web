import type { JSX } from 'react';
import { spanText } from '@/core/time';
import { Icon } from '@/features/playback/ui/IconsScreen';
import { ProgressBar } from '@/features/playback/ui/ProgressBarScreen';
import type { VodPlaybackViewModel } from './vodPlaybackViewModel';
import { vodPermille } from './vodStage';

/**
 * The VOD seek transport (ux-spec §VOD, Android `VodTransportScreen`):
 * title over a thumbed progress line with position/duration clocks, on a dim
 * band at the screen bottom (the info-overlay idiom).
 */
export function VodTransportScreen({ viewModel }: { viewModel: VodPlaybackViewModel }): JSX.Element {
  const { positionMs, durationMs } = viewModel.controls.progress;
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex flex-col bg-black/70 px-[5rem] py-[2.5rem]"
      data-testid="vod-transport"
    >
      <div className="flex items-center text-white">
        {viewModel.controls.paused && (
          <Icon name="pause" className="mr-[1.25rem] h-[2.5rem] w-[2.5rem] shrink-0" />
        )}
        <span className="truncate text-[2.75rem]" data-testid="vod-transport-title">
          {viewModel.item?.name ?? ''}
        </span>
      </div>
      <div className="mt-[1.5rem] flex items-center text-[1.875rem]">
        <span className="text-white" data-testid="vod-transport-position">
          {spanText(positionMs)}
        </span>
        <ProgressBar
          permille={vodPermille(positionMs, durationMs)}
          thumb
          className="mx-[1.75rem] h-[0.25rem] flex-1"
        />
        <span className="text-telly-text-muted" data-testid="vod-transport-duration">
          {spanText(durationMs)}
        </span>
      </div>
    </div>
  );
}
