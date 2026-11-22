import type { JSX } from 'react';
import { WizardIconScreen, type WizardIconKind } from './WizardIconScreen';
import { WIZARD_DIMS } from './wizardDims';
import type { WizardStep, WizardUiState } from './wizardState';

const EPG_GUIDANCE =
  'Enter EPG URL for the playlist. You can add or change it later in the settings. XMLTV format is only supported.';

const GUIDANCE: Readonly<Record<WizardStep, { icon: WizardIconKind; title: string }>> = {
  TYPE_CHOOSER: { icon: 'playlistAdd', title: 'Playlist type' },
  URL_ENTRY: { icon: 'link', title: 'M3U playlist' },
  PROCESSING: { icon: 'download', title: 'Processing playlist' },
  PROCESSED: { icon: 'download', title: 'Playlist is processed' },
  EPG_URL: { icon: 'link', title: 'EPG URL' },
  SAVING: { icon: 'link', title: 'EPG URL' },
  DONE: { icon: 'download', title: 'Playlist is processed' },
};

/** The muted line under the title: counts on the processed step, the EPG explainer on the EPG step. */
function summaryOf(state: WizardUiState): string | null {
  if (state.step === 'EPG_URL' || state.step === 'SAVING') return EPG_GUIDANCE;
  if (state.step !== 'PROCESSED' && state.step !== 'DONE') return null;
  const moviesOnly = state.liveCount === 0 && state.movieCount > 0;
  return moviesOnly ? `Movies: ${state.movieCount}` : `Channels: ${state.liveCount}`;
}

/** Left guidance pane: 470 dp, big icon + 36 sp step title (screens 03/07/12/13). */
export function WizardGuidanceScreen({ state }: { state: WizardUiState }): JSX.Element {
  const { icon, title } = GUIDANCE[state.step];
  const summary = summaryOf(state);
  return (
    <div
      className={`${WIZARD_DIMS.guidancePane} flex h-full bg-telly-guidance-pane`}
      data-testid="wizard-guidance"
    >
      <WizardIconScreen
        kind={icon}
        className="h-[calc(128*var(--dp))] w-[calc(128*var(--dp))] text-telly-text"
      />
      <div className="ml-[calc(24*var(--dp))] w-[calc(198*var(--dp))] pt-[calc(28*var(--dp))]">
        <h2 className="text-[calc(36*var(--dp))] leading-[calc(48*var(--dp))] font-normal tracking-[-0.01em] text-telly-text">
          {title}
        </h2>
        {summary !== null && (
          <p className="pt-[calc(2*var(--dp))] text-[calc(14*var(--dp))] leading-[calc(19*var(--dp))] text-telly-text-guidance-muted">
            {summary}
          </p>
        )}
      </div>
    </div>
  );
}
