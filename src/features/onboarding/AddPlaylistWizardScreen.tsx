import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { finishEpg, pastePlaylistUrl, setEpgUrl } from './addPlaylistEpg';
import { type WizardSession, useAddPlaylistWizard } from './useAddPlaylistWizard';
import { DP_STYLE } from './wizardDims';
import { WizardEpgStepScreen } from './WizardEpgStepScreen';
import { WizardGuidanceScreen } from './WizardGuidanceScreen';
import { WizardNameStepScreen } from './WizardNameStepScreen';
import { WizardProcessingScreen } from './WizardProcessingScreen';
import { WizardTypeStepScreen } from './WizardTypeStepScreen';
import { WizardUrlStepScreen } from './WizardUrlStepScreen';

/** The middle + buttons columns for one wizard step. */
function WizardStepScreen({ vm, state, exit }: WizardSession): JSX.Element {
  switch (state.step) {
    case 'TYPE_CHOOSER':
      return <WizardTypeStepScreen onChoose={(type) => vm.chooseType(type)} onCancel={exit} />;
    case 'URL_ENTRY':
      return (
        <WizardUrlStepScreen
          url={state.url}
          error={state.error}
          onUrlChange={(url) => vm.setUrl(url)}
          onNext={() => vm.submitUrl()}
          onBack={exit}
        />
      );
    case 'PROCESSING':
      return <WizardProcessingScreen />;
    case 'EPG_URL':
    case 'SAVING':
      return (
        <WizardEpgStepScreen
          epgUrl={state.epgUrl}
          error={state.error}
          onEpgUrlChange={(url) => setEpgUrl(vm, url)}
          onPastePlaylistUrl={() => pastePlaylistUrl(vm)}
          onDone={() => void finishEpg(vm)}
          onBack={exit}
        />
      );
    default:
      return (
        <WizardNameStepScreen
          name={state.name}
          kind={state.kind}
          onNameChange={(name) => vm.setName(name)}
          onKindChange={(kind) => vm.chooseKind(kind)}
          onNext={() => vm.confirm()}
          onBack={exit}
        />
      );
  }
}

/**
 * Add-playlist wizard host (Android `WizardScreen`): guidance pane on the
 * left, the active step on the right. BACK walks one step backwards and
 * leaves the wizard from step one.
 */
export function AddPlaylistWizardScreen(): JSX.Element {
  const session = useAddPlaylistWizard();
  return (
    <FocusScope id="wizard" onBack={session.exit}>
      <div
        className="flex h-full w-full bg-telly-onboarding-bg text-telly-text"
        style={DP_STYLE}
        data-testid="wizard"
        data-step={session.state.step}
      >
        <WizardGuidanceScreen state={session.state} />
        <WizardStepScreen {...session} />
      </div>
    </FocusScope>
  );
}
