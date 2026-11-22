import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import type { PlaylistType } from './wizardState';
import { WizardActionRowScreen } from './WizardActionRowScreen';
import { WizardPanesScreen } from './WizardPanesScreen';

interface TypeStepProps {
  onChoose: (type: PlaylistType) => void;
  onCancel: () => void;
}

/** Step 1 (screen 03): pick the playlist type; only M3U advances this slice. */
export function WizardTypeStepScreen({ onChoose, onCancel }: TypeStepProps): JSX.Element {
  return (
    <FocusScope id="wizard-type" autoFocus="first">
      <WizardPanesScreen
        actions={
          <>
            <WizardActionRowScreen
              focusId="wizard-type-m3u"
              text="M3U playlist"
              onClick={() => onChoose('M3U')}
            />
            <WizardActionRowScreen
              focusId="wizard-type-xtream"
              text="Xtream Codes"
              onClick={() => onChoose('XTREAM_CODES')}
            />
            <WizardActionRowScreen
              focusId="wizard-type-stalker"
              text="Stalker Portal"
              onClick={() => onChoose('STALKER_PORTAL')}
            />
          </>
        }
        buttons={
          <WizardActionRowScreen focusId="wizard-cancel" text="Cancel" width="button" onClick={onCancel} />
        }
      />
    </FocusScope>
  );
}
