import type { JSX } from 'react';
import { WizardButtonsPaneScreen } from './WizardPanesScreen';

/**
 * Shown while the playlist downloads and parses (screen 11): an
 * indeterminate 270-degree arc spinning in the middle column, no actions.
 */
export function WizardProcessingScreen(): JSX.Element {
  return (
    <div className="flex min-w-0 flex-1" data-testid="wizard-processing">
      <div className="flex h-full min-w-0 flex-1 items-center justify-center">
        <svg
          viewBox="0 0 48 48"
          className="h-[calc(48*var(--dp))] w-[calc(48*var(--dp))] animate-spin text-telly-text"
          aria-label="Processing playlist"
          role="img"
        >
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="94.25 31.42"
          />
        </svg>
      </div>
      <WizardButtonsPaneScreen />
    </div>
  );
}
