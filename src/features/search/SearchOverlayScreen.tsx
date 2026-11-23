import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { FocusScope } from '@/core/focus/FocusScope';
import { CustomRecordingFormScreen, searchRecordingFor } from '@/features/recording';
import { menuRowId } from './searchIds';
import {
  SEARCH_PROGRAM_ACTIONS,
  type SearchOverlay,
  type SearchOverlays,
  type SearchProgramAction,
} from './searchOverlay';
import { runMenuAction } from './searchProgramMenu';
import type { SearchProgramHit } from './searchResults';
import { useMenuLabels } from './useSearchOverlay';

export const COMING_SOON_SUBTITLE = 'Coming soon to telly';

interface SearchOverlayProps {
  overlay: SearchOverlay;
  overlays: SearchOverlays;
}

/** The search screen's transient overlays: the guide-cell dropdown and the branded coming-soon placeholder. */
export function SearchOverlayScreen({ overlay, overlays }: SearchOverlayProps): JSX.Element | null {
  const close = (): void => {
    overlays.dismiss();
  };
  if (overlay.kind === 'ProgramMenu')
    return <SearchDropdownScreen hit={overlay.hit} overlays={overlays} close={close} />;
  if (overlay.kind === 'CustomRecording')
    return (
      <CustomRecordingFormScreen
        form={overlay.form}
        menu={searchRecordingFor(overlays).menu}
        onBack={close}
      />
    );
  if (overlay.kind === 'ComingSoon') {
    return (
      <FocusScope id="search-coming-soon" trap onBack={close}>
        <div
          data-testid="coming-soon"
          className="absolute inset-0 flex flex-col items-center justify-center bg-telly-onboarding-bg"
        >
          <div className="text-[2.5rem] text-telly-text">{overlay.feature}</div>
          <div className="mt-[1rem] text-[2.25rem] text-telly-text-muted">{COMING_SOON_SUBTITLE}</div>
        </div>
      </FocusScope>
    );
  }
  return null;
}

interface DropdownProps {
  hit: SearchProgramHit;
  overlays: SearchOverlays;
  close(): void;
}

/**
 * OK on a programme result opens the guide-cell action dropdown (capture 27):
 * Remind / Record / Custom recording / Add to My list / Program description,
 * rendered at the detail-card anchor; the Remind / My-list labels flip live.
 */
function SearchDropdownScreen({ hit, overlays, close }: DropdownProps): JSX.Element {
  const labelOf = useMenuLabels(hit);
  const onAction = (action: SearchProgramAction): void => {
    runMenuAction(action, hit, overlays);
    if (overlays.current.kind === 'None') close();
  };
  return (
    <FocusScope id="search-dropdown" trap autoFocus="first" onBack={close}>
      <div className="absolute inset-0 flex justify-end pt-[5rem] pr-[3rem]">
        <ul data-testid="search-dropdown" className="h-fit w-[41.5rem] rounded-[1rem] bg-[#212830] py-[1rem]">
          {SEARCH_PROGRAM_ACTIONS.map((action) => (
            <Focusable
              key={action}
              as="li"
              focusId={menuRowId(action)}
              onClick={() => onAction(action)}
              className="mx-[1rem] flex h-[5rem] items-center rounded-[0.5rem] px-[1.5rem] text-[2rem] text-telly-text"
              focusedClassName="bg-telly-focus-fill !text-telly-focus-text"
            >
              {labelOf(action)}
            </Focusable>
          ))}
        </ul>
      </div>
    </FocusScope>
  );
}
