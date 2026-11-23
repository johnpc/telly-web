import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { FocusScope } from '@/core/focus/FocusScope';
import { useNavigator } from '@/core/navigation/useNavigator';

/**
 * The web has no launcher to return to: where the Android app would finish,
 * telly-web shows this frame — the `Exited` route, so the Navigator is the one
 * owner of "the app has exited". OK starts over from Boot.
 */
export function ExitedScreen(): JSX.Element {
  const navigator = useNavigator();
  const onRestart = (): void => navigator.replaceAll({ kind: 'Boot' });
  return (
    <FocusScope id="exited" trap autoFocus="first">
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-6 bg-black text-telly-text"
        data-testid="exited-screen"
        data-state="exited"
      >
        <img src={`${import.meta.env.BASE_URL}icon.png`} alt="" className="h-24 w-24 opacity-60" />
        <p className="text-xl text-telly-text-secondary">telly has exited</p>
        <Focusable
          focusId="exited-restart"
          className="rounded-full bg-telly-button-resting px-8 py-3 text-lg"
          focusedClassName="bg-telly-focus-fill text-telly-focus-text"
          onClick={onRestart}
        >
          Start telly
        </Focusable>
      </div>
    </FocusScope>
  );
}
