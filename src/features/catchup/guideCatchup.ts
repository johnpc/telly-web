import { type CatchupRequest, type CatchupSession, catchupSession } from './catchupSession';

/**
 * The guide's half of catch-up (ux-spec §3.17, Android `GuideCatchup`): OK
 * on a playable past cell parks the resolved request in the shared session
 * and pushes fullscreen playback, which consumes it instead of tuning live.
 */
export const GuideCatchup = {
  play(request: CatchupRequest, goFullscreen: () => void, session: CatchupSession = catchupSession): void {
    session.set(request);
    goFullscreen();
  },
};
