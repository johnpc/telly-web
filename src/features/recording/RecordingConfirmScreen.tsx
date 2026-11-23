import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { FocusScope } from '@/core/focus/FocusScope';

export interface RecordingConfirmProps {
  title: string;
  body: string;
  /** The affirmative pill's label (Stop / Remove / Delete); focused first, Cancel below it. */
  primary: string;
  onAccept: () => void;
  onDismiss: () => void;
  testId?: string;
}

function ActionPill({ label, onClick }: { label: string; onClick: () => void }): JSX.Element {
  return (
    <li className="w-[41rem] max-w-full">
      <Focusable
        focusId={`recording-confirm-${label}`}
        as="button"
        onClick={onClick}
        className="flex h-[5.5rem] w-full items-center rounded-[0.5rem] bg-telly-button-resting px-[2rem] text-left text-[2rem] text-telly-text"
        focusedClassName="!bg-telly-focus-fill !text-telly-focus-text"
      >
        {label}
      </Focusable>
    </li>
  );
}

/**
 * The DVR GuidedStep confirms (Android `RecordingScreenConfirm`): warning
 * icon + question title + body line in the left guidance pane, the primary
 * action pill focused first and Cancel beneath it; BACK cancels.
 */
export function RecordingConfirmScreen({
  title,
  body,
  primary,
  onAccept,
  onDismiss,
  testId = 'recording-confirm',
}: RecordingConfirmProps): JSX.Element {
  return (
    <FocusScope id={`recording-confirm-${testId}`} trap autoFocus="first" onBack={onDismiss}>
      <div
        className="absolute inset-0 z-40 flex flex-col bg-telly-onboarding-bg lg:flex-row"
        data-testid={testId}
      >
        <div className="flex w-full items-start bg-telly-guidance-pane px-14 pt-16 lg:h-full lg:w-[74rem] lg:pt-[19rem]">
          <svg
            viewBox="0 0 24 24"
            className="h-32 w-32 shrink-0 text-telly-text lg:h-64 lg:w-64"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
          <div className="ml-6 w-[39rem] pt-7">
            <h1 className="text-[3rem] leading-[4rem] tracking-tight text-telly-text lg:text-[4.5rem] lg:leading-[6rem]">
              {title}
            </h1>
            <p className="mt-2 text-[2rem] leading-[2.4375rem] text-telly-text-guidance-muted">{body}</p>
          </div>
        </div>
        <ul className="m-0 flex list-none flex-col gap-4 p-0 pt-10 pl-5 lg:pt-[23.625rem]">
          <ActionPill label={primary} onClick={onAccept} />
          <ActionPill label="Cancel" onClick={onDismiss} />
        </ul>
      </div>
    </FocusScope>
  );
}
