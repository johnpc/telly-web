import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { WIZARD_DIMS } from './wizardDims';

interface WelcomePillProps {
  focusId: string;
  text: string;
  onClick: () => void;
}

/** Welcome-screen pill button: 36 dp tall, grey at rest, light when focused (reference screen 02). */
export function WelcomePillScreen({ focusId, text, onClick }: WelcomePillProps): JSX.Element {
  return (
    <Focusable
      focusId={focusId}
      role="button"
      onClick={onClick}
      className="flex h-[calc(36*var(--dp))] items-center rounded-[calc(4*var(--dp))] bg-telly-button-resting px-[calc(16.5*var(--dp))] text-[calc(14*var(--dp))] leading-none text-telly-text"
      focusedClassName={WIZARD_DIMS.focusPill}
    >
      {text}
    </Focusable>
  );
}
