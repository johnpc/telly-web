import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { spanText } from '@/core/time';
import { MovieIcon } from '@/features/guide/GuideIconsScreen';
import { SettingsRowScreen } from '@/features/settings/SettingsRowScreen';
import type { VodPlaybackViewModel } from './vodPlaybackViewModel';

const RESUME = 'Resume';
const START_OVER = 'Start over';

/**
 * Resume/Start-over GuidedStep shown when a stored position sits inside the
 * resume band (ux-spec §VOD, Android `VodResumeScreen`): film icon +
 * "Resume playback?" in the guidance pane, the two action pills right.
 */
export function VodResumeScreen({
  viewModel,
  positionMs,
}: {
  viewModel: VodPlaybackViewModel;
  positionMs: number;
}): JSX.Element {
  const activate = (rowId: string): void =>
    rowId === `vod:${RESUME}` ? viewModel.resumeStored() : viewModel.startOver();
  return (
    <FocusScope id="vod-resume" trap autoFocus="first">
      <div
        className="absolute inset-0 flex flex-col bg-telly-onboarding-bg lg:flex-row"
        data-testid="vod-resume"
      >
        <div className="flex w-full items-start bg-telly-guidance-pane px-14 pt-16 lg:h-full lg:w-[74rem] lg:pt-[19rem]">
          <MovieIcon className="h-32 w-32 shrink-0 text-telly-text lg:h-64 lg:w-64" />
          <div className="ml-6 w-[39rem] pt-7">
            <h1 className="text-[3rem] leading-[4rem] tracking-tight text-telly-text lg:text-[4.5rem] lg:leading-[6rem]">
              Resume playback?
            </h1>
            <p className="mt-2 text-[2rem] leading-[2.4375rem] text-telly-text-guidance-muted">
              Continue watching &quot;{viewModel.item?.name ?? ''}&quot; from {spanText(positionMs)}
            </p>
          </div>
        </div>
        <ul className="m-0 flex list-none flex-col gap-4 p-0 pt-10 pl-5 lg:pt-[23.625rem]">
          {[RESUME, START_OVER].map((label) => (
            <li key={label} className="w-[41rem] max-w-full">
              <SettingsRowScreen
                row={{ kind: 'Action', id: `vod:${label}`, title: label }}
                transparent
                onActivate={activate}
              />
            </li>
          ))}
        </ul>
      </div>
    </FocusScope>
  );
}
