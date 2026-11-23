import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { recordDotLabel } from './recordingIndicator';
import { useChannelRecording } from './useRecordings';

/**
 * The transport's record dot (Android `TransportRecordDot`): red while the
 * CURRENT channel is being recorded, the resting grey ring otherwise —
 * clickable either way (start instant record / offer Stop), mirroring
 * TiviMate's transport record button.
 */
export function TransportRecordDot({
  channelId,
  onToggle,
}: {
  channelId: number | null;
  onToggle: () => void;
}): JSX.Element {
  const recording = useChannelRecording(channelId);
  return (
    <Focusable
      focusId="transport-record"
      as="button"
      aria-label={recordDotLabel(recording)}
      data-testid="transport-record"
      data-recording={recording ? 'true' : 'false'}
      onClick={onToggle}
      className="ml-[2rem] flex h-[5rem] w-[5rem] items-center justify-center rounded-full"
      focusedClassName="bg-telly-focus-fill"
    >
      <span
        className={`h-[1.75rem] w-[1.75rem] rounded-full ${
          recording ? 'bg-[#e53935]' : 'border-[0.5rem] border-telly-text-muted'
        }`}
      />
    </Focusable>
  );
}
