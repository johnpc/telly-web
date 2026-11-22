import type { JSX } from 'react';

/** A bare frame while the channel count resolves — TiviMate's skeleton. */
export function BootScreen(): JSX.Element {
  return <div className="h-full w-full bg-telly-onboarding-bg" data-testid="boot-screen" />;
}
