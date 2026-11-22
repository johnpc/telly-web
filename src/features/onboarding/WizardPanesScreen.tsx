import type { JSX, ReactNode } from 'react';
import { WizardActionRowScreen } from './WizardActionRowScreen';
import { WizardIconScreen } from './WizardIconScreen';
import { WIZARD_DIMS } from './wizardDims';

/** The 1 dp divider and 152 dp button column behind it, shared by every step. */
export function WizardButtonsPaneScreen({ children }: { children?: ReactNode }): JSX.Element {
  return (
    <>
      <div className="h-full w-[calc(1*var(--dp))] shrink-0 bg-telly-pane-divider" />
      <div className={`${WIZARD_DIMS.pane} ${WIZARD_DIMS.buttonPane}`}>{children}</div>
    </>
  );
}

/** The wizard's middle column (action rows from 189 dp down) plus the button column. */
export function WizardPanesScreen({
  actions,
  buttons,
}: {
  actions: ReactNode;
  buttons: ReactNode;
}): JSX.Element {
  return (
    <div className="flex min-w-0 flex-1">
      <div className={`${WIZARD_DIMS.pane} min-w-0 flex-1`}>{actions}</div>
      <WizardButtonsPaneScreen>{buttons}</WizardButtonsPaneScreen>
    </div>
  );
}

interface NextBackProps {
  onNext: () => void;
  onBack: () => void;
  nextEnabled: boolean;
}

/** The shared Next (with -> glyph) over Back button pair (screens 07-12). */
export function WizardNextBackButtonsScreen({ onNext, onBack, nextEnabled }: NextBackProps): JSX.Element {
  return (
    <>
      <WizardActionRowScreen
        focusId="wizard-next"
        text="Next"
        width="button"
        enabled={nextEnabled}
        onClick={onNext}
        trailingIcon={
          <WizardIconScreen kind="next" className="h-[calc(12*var(--dp))] w-[calc(12*var(--dp))]" />
        }
      />
      <WizardActionRowScreen focusId="wizard-back" text="Back" width="button" onClick={onBack} />
    </>
  );
}
