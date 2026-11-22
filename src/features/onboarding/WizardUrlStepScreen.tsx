import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { useWizardEditor } from './useWizardEditor';
import { WizardActionRowScreen } from './WizardActionRowScreen';
import { WizardNextBackButtonsScreen, WizardPanesScreen } from './WizardPanesScreen';
import { WizardClipboardRowScreen, WizardUrlErrorScreen, WizardUrlFieldScreen } from './WizardUrlFieldScreen';
import type { WizardError } from './wizardState';

interface UrlStepProps {
  url: string;
  error: WizardError | null;
  onUrlChange: (url: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const noop = (): void => undefined;

/** Step 2 (screens 07-10): enter the playlist URL, then Next to load it. */
export function WizardUrlStepScreen({ url, error, onUrlChange, onNext, onBack }: UrlStepProps): JSX.Element {
  const hasUrl = url.trim() !== '';
  const edit = useWizardEditor('wizard-url', 'wizard-next', hasUrl);
  return (
    <FocusScope id="wizard-url-step" autoFocus="first">
      <WizardPanesScreen
        actions={
          <>
            <WizardUrlFieldScreen label="Enter URL" value={url} edit={edit} onValueChange={onUrlChange} />
            {error !== null && <WizardUrlErrorScreen error={error} />}
            <WizardClipboardRowScreen focusId="wizard-paste-clipboard" onPaste={onUrlChange} />
            <WizardActionRowScreen
              focusId="wizard-local-playlist"
              text="Select local playlist"
              onClick={noop}
            />
          </>
        }
        buttons={<WizardNextBackButtonsScreen onNext={onNext} onBack={onBack} nextEnabled={hasUrl} />}
      />
    </FocusScope>
  );
}
