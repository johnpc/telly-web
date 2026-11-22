import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { sp } from './guideCss';

interface MessageProps {
  headline: string;
  subtitle: string;
  testId: string;
}

/**
 * Full-screen centered headline + grey subtitle on the onboarding background
 * (Android `OnboardingScreenMessage`): the sheet's description layer and
 * the branded coming-soon placeholder.
 */
export function MessageScreen({ headline, subtitle, testId }: MessageProps): JSX.Element {
  return (
    <FocusScope id={`guide-message-${testId}`} trap autoFocus={false}>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center bg-telly-onboarding-bg px-[6%] text-center"
        data-testid={testId}
      >
        <p className="text-telly-text" style={{ fontSize: sp(20) }}>
          {headline}
        </p>
        <p className="mt-[0.5em] text-telly-text-muted" style={{ fontSize: sp(18) }}>
          {subtitle}
        </p>
      </div>
    </FocusScope>
  );
}
