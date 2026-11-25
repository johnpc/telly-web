import type { ChannelRow } from '@/core/db/types';
import type { Route } from '@/core/navigation/routes';
import { type LaunchLink, matchChannel, NO_LINK } from './deepLink';

/**
 * Where a cold start lands, as ONE value: the route to show and whether the
 * guide may tune its preview there (Android `StartRoute.kt`). The web adds
 * `DeepLink`: a `?channel=` launch link naming a channel that exists goes
 * straight to fullscreen playback of it, whatever "Turn on last channel on
 * app start" says.
 */
// @stateMachine('Start route')
export type StartDecision =
  | { kind: 'Welcome'; route: Route; tunesPreview: true }
  | { kind: 'Playback'; route: Route; tunesPreview: true }
  | { kind: 'GuideUntuned'; route: Route; tunesPreview: false }
  | { kind: 'DeepLink'; route: Route; tunesPreview: true; channel: ChannelRow };

/** What the shell tells the user about a launch link it could not honour. */
export type StartNotice = { kind: 'None' } | { kind: 'NoSuchChannel'; query: string };

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
 * only navigates once the channel count resolves. A launch link that names a
 * channel wins; otherwise no channels → welcome; "Turn on last channel on
 * app start" ON → fullscreen playback; OFF → the guide with NO preview tune.
 * The decision is handed to exactly ONE guide. The link is honoured by the
 * FIRST decision only; a link nobody matched leaves `notice` behind.
 */
export class StartRoute {
  private pending: StartDecision | null = null;
  private link: LaunchLink;
  private noticeState: StartNotice = { kind: 'None' };
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly lastChannelOnStart: () => boolean = (): boolean => true,
    link: LaunchLink = NO_LINK,
    /** Makes the deep-linked channel the one fullscreen playback restores (`lastChannelId`). */
    private readonly rememberChannel: (channelId: number) => void = (): void => undefined,
  ) {
    this.link = link;
  }

  /** The launch link still waiting for a decision; `Channel` means the decision needs the channel list. */
  get launchLink(): LaunchLink {
    return this.link;
  }

  get notice(): StartNotice {
    return this.noticeState;
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  decide(channelCount: number, channels: readonly ChannelRow[] = []): StartDecision {
    const decision = this.decideLink(channels) ?? this.decidePlain(channelCount);
    this.pending = decision;
    return decision;
  }

  /** The decision, loading the visible channel list only when a launch link needs it: a plain start never waits. */
  async resolve(
    channelCount: number,
    visibleChannels: () => Promise<readonly ChannelRow[]>,
  ): Promise<StartDecision> {
    const channels = this.link.kind === 'Channel' ? await visibleChannels() : [];
    return this.decide(channelCount, channels);
  }

  forChannelCount(channelCount: number): Route {
    return this.decide(channelCount).route;
  }

  dismissNotice(): void {
    this.setNotice({ kind: 'None' });
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

  private decidePlain(channelCount: number): StartDecision {
    if (channelCount <= 0) return START_WELCOME;
    return this.lastChannelOnStart() ? START_PLAYBACK : START_GUIDE_UNTUNED;
  }

  private decideLink(channels: readonly ChannelRow[]): StartDecision | null {
    const link = this.link;
    this.link = NO_LINK;
    if (link.kind === 'None') return null;
    const channel = matchChannel(channels, link.query);
    if (channel === null) {
      this.setNotice({ kind: 'NoSuchChannel', query: link.query });
      return null;
    }
    this.rememberChannel(channel.id);
    return { kind: 'DeepLink', route: { kind: 'Playback' }, tunesPreview: true, channel };
  }

  private setNotice(notice: StartNotice): void {
    this.noticeState = notice;
    this.listeners.forEach((listener) => listener());
  }
}
