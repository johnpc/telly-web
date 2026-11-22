import type { JSX } from 'react';
import { type ConfirmSpec, runConfirmPrimary } from './confirmSpecs';
import { rowFocusId, useOverlayFocus } from './focusMemory';
import type { SettingsController } from './settingsController';
import { SettingsRowScreen } from './SettingsRowScreen';

interface ConfirmProps {
  controller: SettingsController;
  spec: ConfirmSpec;
}

/**
 * A full-screen GuidedStep in the reference style (screens 22/28): left
 * guidance pane with warning icon + 36 sp title + body line, action pills
 * right (primary focused first, then Cancel).
 */
export function SettingsConfirmScreen({ controller, spec }: ConfirmProps): JSX.Element {
  useOverlayFocus(rowFocusId(`guided:${spec.primary}`));
  return (
    <div
      className="absolute inset-0 flex flex-col bg-telly-onboarding-bg lg:flex-row"
      data-testid="settings-confirm"
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
            {spec.title}
          </h1>
          <p className="mt-2 text-[2rem] leading-[2.4375rem] text-telly-text-guidance-muted">{spec.body}</p>
        </div>
      </div>
      <ul className="m-0 flex list-none flex-col gap-4 p-0 pl-5 pt-10 lg:pt-[23.625rem]">
        {[spec.primary, 'Cancel'].map((label) => (
          <li key={label} className="w-[41rem] max-w-full">
            <SettingsRowScreen
              row={{ kind: 'Action', id: `guided:${label}`, title: label }}
              transparent
              onActivate={() =>
                void (label === 'Cancel' ? controller.dismissOverlay() : runConfirmPrimary(controller))
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
