import type { JSX } from 'react';

/** Full-screen centered headline + grey subtitle on the onboarding background (coming-soon, description). */
export function Message({ headline, subtitle }: { headline: string; subtitle: string }): JSX.Element {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-[1rem] bg-telly-onboarding-bg px-[5rem] text-center"
      data-testid="playback-message"
    >
      <h2 className="text-[2.5rem] text-telly-text">{headline}</h2>
      <p className="max-w-[80rem] text-[2.25rem] text-telly-text-muted">{subtitle}</p>
    </div>
  );
}
