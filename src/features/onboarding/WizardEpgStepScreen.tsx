import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { useWizardEditor } from './useWizardEditor';
import { WizardActionRowScreen } from './WizardActionRowScreen';
import { WizardPanesScreen } from './WizardPanesScreen';
import { WizardClipboardRowScreen, WizardUrlErrorScreen, WizardUrlFieldScreen } from './WizardUrlFieldScreen';
import type { WizardError } from './wizardState';

interface EpgStepProps {
  epgUrl: string;
  error: WizardError | null;
  onEpgUrlChange: (url: string) => void;
  onPastePlaylistUrl: () => void;
  onDone: () => void;
  onBack: () => void;
}

const noop = (): void => undefined;

/** The EPG step (screen 13): url-tvg pre-filled into Enter URL, paste helpers, greyed "Use default source", Done / Back. */
export function WizardEpgStepScreen(props: EpgStepProps): JSX.Element {
  const { epgUrl, error, onEpgUrlChange, onPastePlaylistUrl, onDone, onBack } = props;
  const edit = useWizardEditor('wizard-epg-url', 'wizard-done', true);
  return (
    <FocusScope id="wizard-epg-step" autoFocus="first">
      <WizardPanesScreen
        actions={
          <>
            <WizardUrlFieldScreen
              label="Enter URL"
              value={epgUrl}
              edit={edit}
              onValueChange={onEpgUrlChange}
            />
            {error !== null && <WizardUrlErrorScreen error={error} />}
            <WizardClipboardRowScreen focusId="wizard-paste-clipboard" onPaste={onEpgUrlChange} />
            <WizardActionRowScreen
              focusId="wizard-paste-playlist-url"
              text="Paste playlist URL"
              secondaryText="You can edit playlist URL if it has the similar format"
              onClick={onPastePlaylistUrl}
            />
            {/* Greyed in the reference capture; telly has no bundled default. */}
            <WizardActionRowScreen
              focusId="wizard-default-source"
              text="Use default source"
              onClick={noop}
              enabled={false}
            />
          </>
        }
        buttons={
          <>
            <WizardActionRowScreen focusId="wizard-done" text="Done" width="button" onClick={onDone} />
            <WizardActionRowScreen focusId="wizard-back" text="Back" width="button" onClick={onBack} />
          </>
        }
      />
    </FocusScope>
  );
}
