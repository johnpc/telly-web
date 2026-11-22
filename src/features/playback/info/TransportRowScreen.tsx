import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
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
}

/** Transport row revealed by a second UP: elapsed/duration left, ⏮ ⏪ ⏸ ⏩ ⏭ center, LIVE badge and record dot right. */
export function TransportRow({ data, onFeature }: TransportRowProps): JSX.Element {
  return (
    <div className="flex items-center px-[5rem] py-[1rem] text-[1.875rem]" data-testid="transport-row">
      <span className="text-white">{data.elapsed ?? ''}</span>
      <span className="text-telly-text-muted">&nbsp;/ {data.duration ?? ''}</span>
      <div className="flex flex-1 justify-center gap-[1.5rem]">
        {BUTTONS.map((button, index) => (
          <IconCircle
            key={index}
            focusId={`transport-${index}`}
            icon={button.icon}
            label={button.feature}
            onClick={() => onFeature(button.feature)}
          />
        ))}
      </div>
      <span className="rounded-[0.375rem] border border-white px-[0.625rem] text-[1.5rem] text-white">
        LIVE
      </span>
      <Focusable
        focusId="transport-record"
        as="button"
        aria-label="Record"
        data-testid="transport-record"
        onClick={() => onFeature('Record')}
        className="ml-[2rem] flex h-[5rem] w-[5rem] items-center justify-center rounded-full"
        focusedClassName="bg-telly-focus-fill"
      >
        <span className="h-[1.75rem] w-[1.75rem] rounded-full border-[0.5rem] border-telly-text-muted" />
      </Focusable>
    </div>
  );
}
