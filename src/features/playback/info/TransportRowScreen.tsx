import type { JSX } from 'react';
import { type TransportCatchup, transportAction, transportIcon, transportLabel } from '@/features/catchup';
import { TransportRecordDot } from '@/features/recording';
import { IconCircle } from '../ui/IconCircleScreen';
import type { IconName } from '../ui/IconsScreen';
import type { PlaybackInfoData } from './playbackInfo';

/** The five center transport buttons: coming-soon features during live playback (live pause = timeshift, a later slice). */
const BUTTONS: readonly { icon: IconName; feature: string }[] = [
  { icon: 'skip-previous', feature: 'Previous programme' },
  { icon: 'rewind', feature: 'Timeshift' },
  { icon: 'pause', feature: 'Timeshift' },
  { icon: 'forward', feature: 'Timeshift' },
  { icon: 'skip-next', feature: 'Next programme' },
];

interface TransportRowProps {
  data: PlaybackInfoData;
  onFeature: (feature: string) => void;
  /** Non-null during catch-up: ⏮/⏭ hop programmes, RW/FF seek, ⏸ pauses; the LIVE badge disappears. */
  catchup?: TransportCatchup | null;
}

/** Transport row revealed by a second UP: elapsed/duration left, ⏮ ⏪ ⏸ ⏩ ⏭ center, LIVE badge and record dot right. */
export function TransportRow({ data, onFeature, catchup = null }: TransportRowProps): JSX.Element {
  return (
    <div
      className="flex items-center px-[5rem] py-[1rem] text-[1.875rem]"
      data-testid="transport-row"
      data-catchup={catchup === null ? undefined : 'true'}
    >
      <span className="text-white" data-testid="transport-elapsed">
        {data.elapsed ?? ''}
      </span>
      <span className="text-telly-text-muted" data-testid="transport-duration">
        &nbsp;/ {data.duration ?? ''}
      </span>
      <div className="flex flex-1 justify-center gap-[1.5rem]">
        {BUTTONS.map((button, index) => (
          <IconCircle
            key={index}
            focusId={`transport-${index}`}
            icon={transportIcon(index, button.icon, catchup)}
            label={transportLabel(index, button.feature, catchup)}
            onClick={() => transportAction(index, button.feature, onFeature, catchup)}
          />
        ))}
      </div>
      {catchup === null && (
        <span className="rounded-[0.375rem] border border-white px-[0.625rem] text-[1.5rem] text-white">
          LIVE
        </span>
      )}
      <TransportRecordDot channelId={data.channelId} onToggle={() => onFeature('Record')} />
    </div>
  );
}
