// BACK at the navigator's root. A store-packaged TV app must hand control back
// to the TV — Tizen's `application.exit()`, webOS's `platformBack()` — rather
// than paint its own exit frame; the plain web (nothing to hand back to) shows
// the `Exited` route. `RootScreen` is the one caller.
import { onExitRequested as tizenExit } from './tizen';
import { platformBack as webOSBack } from './webos';

/** True when the host platform took the exit; false means the app must show its own. */
export function exitToPlatform(): boolean {
  return tizenExit() || webOSBack();
}
