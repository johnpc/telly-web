import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { useNavigator } from '@/core/navigation/useNavigator';
import { RESTORE_PILL_ID } from './useRestoreOffer';
import { useWelcomeRestore } from './useWelcomeRestore';
import { WelcomePillScreen } from './WelcomePillScreen';

/** First-run landing screen; pixel-matched to reference screen 02-welcome. */
export function WelcomeScreen(): JSX.Element {
  const navigator = useNavigator();
  const { offer, busy, activate } = useWelcomeRestore();
  return (
    <FocusScope id="welcome" autoFocus="first">
      <div
        className="flex h-full w-full flex-col items-center justify-center bg-telly-onboarding-bg px-[calc(16*var(--dp))] pt-[calc(6*var(--dp))] text-center"
        data-testid="welcome-screen"
      >
        <h1 className="text-[calc(20*var(--dp))] leading-[calc(28*var(--dp))] font-normal text-telly-text">
          telly doesn&apos;t provide any sources of TV channels
        </h1>
        <p className="mt-[calc(8*var(--dp))] text-[calc(18*var(--dp))] leading-[calc(26*var(--dp))] text-telly-text-muted">
          To watch TV channels, please add a playlist provided by your IPTV service
        </p>
        <div className="mt-[calc(40*var(--dp))] flex gap-[calc(16*var(--dp))]">
          {offer.kind !== 'None' && (
            <WelcomePillScreen
              focusId={RESTORE_PILL_ID}
              text={busy ? 'Restoring…' : 'Restore previous setup'}
              onClick={activate}
            />
          )}
          <WelcomePillScreen
            focusId="welcome-add-playlist"
            text="Add playlist"
            onClick={() => navigator.push({ kind: 'AddPlaylistWizard' })}
          />
          <WelcomePillScreen
            focusId="welcome-settings"
            text="Settings"
            onClick={() => navigator.push({ kind: 'Settings' })}
          />
        </div>
      </div>
    </FocusScope>
  );
}
