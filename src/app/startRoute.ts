import type { Route } from '@/core/navigation/routes';

/**
 * Where a cold start lands, as ONE value: the route to show and whether the
 * guide may tune its preview there (Android `StartRoute.kt`).
 */
// @stateMachine('Start route')
export type StartDecision =
  | { kind: 'Welcome'; route: Route; tunesPreview: true }
  | { kind: 'Playback'; route: Route; tunesPreview: true }
  | { kind: 'GuideUntuned'; route: Route; tunesPreview: false };

export const START_WELCOME: StartDecision = {
  kind: 'Welcome',
  route: { kind: 'Welcome' },
  tunesPreview: true,
};
export const START_PLAYBACK: StartDecision = {
  kind: 'Playback',
  route: { kind: 'Playback' },
  tunesPreview: true,
};
export const START_GUIDE_UNTUNED: StartDecision = {
  kind: 'GuideUntuned',
  route: { kind: 'Guide' },
  tunesPreview: false,
};

/**
 * Cold-start destination policy: the app boots on `Boot` (a bare frame) and
 * only navigates once the channel count resolves. No channels → welcome;
 * "Turn on last channel on app start" ON → fullscreen playback; OFF → the
 * guide with NO preview tune. The decision is handed to exactly ONE guide.
 */
export class StartRoute {
  private pending: StartDecision | null = null;

  constructor(private readonly lastChannelOnStart: () => boolean = (): boolean => true) {}

  decide(channelCount: number): StartDecision {
    const decision =
      channelCount <= 0 ? START_WELCOME : this.lastChannelOnStart() ? START_PLAYBACK : START_GUIDE_UNTUNED;
    this.pending = decision;
    return decision;
  }

  forChannelCount(channelCount: number): Route {
    return this.decide(channelCount).route;
  }

  /** The cold-start decision, handed to exactly one guide; absent afterwards. */
  claimForGuide(): StartDecision | null {
    const claimed = this.pending;
    this.pending = null;
    return claimed;
  }

  /** Whether the guide being built should tune its preview (true after the first claim). */
  guideTunesPreview(): boolean {
    return this.claimForGuide()?.tunesPreview ?? true;
  }
}
