import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { useWizardEditor } from './useWizardEditor';
import { WizardActionRowScreen } from './WizardActionRowScreen';
import { WizardIconScreen } from './WizardIconScreen';
import { WizardNextBackButtonsScreen, WizardPanesScreen } from './WizardPanesScreen';
import { WizardUrlFieldScreen } from './WizardUrlFieldScreen';
import type { PlaylistKind } from './wizardState';

interface NameStepProps {
  name: string;
  kind: PlaylistKind;
  onNameChange: (name: string) => void;
  onKindChange: (kind: PlaylistKind) => void;
  onNext: () => void;
  onBack: () => void;
}

interface RadioRowProps {
  focusId: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}

/** A radio-style guided action row (TV playlist / VOD playlist). */
function RadioRow({ focusId, label, selected, onClick }: RadioRowProps): JSX.Element {
  const icon = (
    <WizardIconScreen
      kind={selected ? 'radioOn' : 'radioOff'}
      className="h-[calc(16*var(--dp))] w-[calc(16*var(--dp))]"
    />
  );
  return (
    <WizardActionRowScreen
      focusId={focusId}
      text={label}
      onClick={onClick}
      leadingIcon={icon}
      aria-checked={selected}
    />
  );
}

/** The processed step (screen 12): editable playlist name pre-filled from the URL host plus the TV/VOD choice. */
export function WizardNameStepScreen({
  name,
  kind,
  onNameChange,
  onKindChange,
  onNext,
  onBack,
}: NameStepProps): JSX.Element {
  const edit = useWizardEditor('wizard-name', 'wizard-next', true);
  return (
    <FocusScope id="wizard-name-step" autoFocus="first">
      <WizardPanesScreen
        actions={
          <>
            <WizardUrlFieldScreen
              label="Playlist name"
              value={name}
              edit={edit}
              onValueChange={onNameChange}
              uriInput={false}
            />
            <RadioRow
              focusId="wizard-kind-tv"
              label="TV playlist"
              selected={kind === 'TV'}
              onClick={() => onKindChange('TV')}
            />
            <RadioRow
              focusId="wizard-kind-vod"
              label="VOD playlist (no TV channels)"
              selected={kind === 'VOD'}
              onClick={() => onKindChange('VOD')}
            />
          </>
        }
        buttons={<WizardNextBackButtonsScreen onNext={onNext} onBack={onBack} nextEnabled />}
      />
    </FocusScope>
  );
}
