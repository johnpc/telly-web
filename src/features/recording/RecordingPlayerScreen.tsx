import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { VideoSurface } from '@/core/player';
import { type RecordingCenter } from './recordingCenter';
import { progressFraction, transportText } from './recordingPlayer';
import type { RecordingListRow } from './recordingRows';
import { recordingCenter } from './recordingRuntime';
import {
  useCaptureEngine,
  useCapturePlayerKeys,
  useCaptureSource,
  useCaptureTransport,
} from './useRecordingPlayer';

interface PlayerProps {
  row: RecordingListRow;
  onExit: () => void;
  center?: Pick<RecordingCenter, 'blobOf' | 'whenSettled'>;
}

/**
 * Fullscreen playback of a DONE capture on its OWN engine over an OPFS
 * object URL (Android `RecordingScreenPlayer`) with a seek transport:
 * LEFT/RIGHT skip ±10 s, OK toggles pause, BACK returns to the library.
 */
export function RecordingPlayerScreen({ row, onExit, center = recordingCenter }: PlayerProps): JSX.Element {
  const engine = useCaptureEngine(row.entry.filePath);
  useCaptureSource(engine, row.entry, center);
  useCapturePlayerKeys(engine);
  const { positionMs, durationMs } = useCaptureTransport(engine);
  return (
    <FocusScope id="recording-player" trap autoFocus={false} onBack={onExit}>
      <div className="absolute inset-0 z-30 bg-black" data-testid="recording-player">
        <VideoSurface engine={engine} className="absolute inset-0 bg-black" />
        <div
          className="absolute inset-x-0 bottom-0 bg-telly-badge-fill px-[5rem] py-[2rem]"
          data-testid="recording-transport"
        >
          <div className="flex items-center">
            <span className="truncate text-[2rem] text-white">{row.entry.title}</span>
            <span className="flex-1" />
            <span className="text-[1.75rem] text-white">{transportText(positionMs, durationMs)}</span>
          </div>
          <div className="mt-[1rem] h-[0.5rem] w-full rounded-[0.25rem] bg-telly-progress-track">
            <div
              className="h-[0.5rem] rounded-[0.25rem] bg-telly-playback-accent"
              style={{ width: `${progressFraction(positionMs, durationMs) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </FocusScope>
  );
}
