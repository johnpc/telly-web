import { describe, expect, it, vi } from 'vitest';
import type { ChannelRow } from '@/core/db/types';
import { StartRoute } from './startRoute';

describe('StartRoute', () => {
  it('sends a fresh install to the welcome flow', () => {
    expect(new StartRoute().forChannelCount(0)).toEqual({ kind: 'Welcome' });
  });
  it('goes straight to playback when last-channel-on-start is on', () => {
    expect(new StartRoute(() => true).forChannelCount(3)).toEqual({ kind: 'Playback' });
  });
  it('lands on the untuned guide when last-channel-on-start is off', () => {
    const route = new StartRoute(() => false);
    expect(route.forChannelCount(3)).toEqual({ kind: 'Guide' });
    expect(route.guideTunesPreview()).toBe(false);
    expect(route.guideTunesPreview()).toBe(true);
  });
  it('hands the decision to exactly one guide', () => {
    const route = new StartRoute();
    route.decide(5);
    expect(route.claimForGuide()?.kind).toBe('Playback');
    expect(route.claimForGuide()).toBeNull();
  });
});

describe('StartRoute with a ?channel= launch link', () => {
  const channels = [channel(1, 'News One'), channel(13, 'Movie House')];

  it('goes straight to fullscreen playback of a channel the link names, even with last-channel-on-start off', () => {
    const remembered: number[] = [];
    const route = new StartRoute(
      () => false,
      { kind: 'Channel', query: 'movie house' },
      (id) => remembered.push(id),
    );
    expect(route.launchLink).toEqual({ kind: 'Channel', query: 'movie house' });
    const decision = route.decide(2, channels);
    expect(decision.kind).toBe('DeepLink');
    expect(decision.route).toEqual({ kind: 'Playback' });
    expect(decision.tunesPreview).toBe(true);
    expect(remembered).toEqual([130]);
    expect(route.notice).toEqual({ kind: 'None' });
    // The link is spent: a later start (OK on Exited) follows the plain policy.
    expect(route.launchLink).toEqual({ kind: 'None' });
    expect(route.decide(2, channels).kind).toBe('GuideUntuned');
  });

  it('falls back to the plain start route and leaves a notice when nothing matches', () => {
    const route = new StartRoute(() => true, { kind: 'Channel', query: 'Nope' });
    const seen: string[] = [];
    route.subscribe(() => seen.push(route.notice.kind));
    expect(route.decide(2, channels).kind).toBe('Playback');
    expect(route.notice).toEqual({ kind: 'NoSuchChannel', query: 'Nope' });
    route.dismissNotice();
    expect(route.notice).toEqual({ kind: 'None' });
    expect(seen).toEqual(['NoSuchChannel', 'None']);
  });

  it('loads the channel list only when a link is waiting', async () => {
    const visible = vi.fn(() => Promise.resolve(channels));
    const plain = new StartRoute(() => true);
    expect((await plain.resolve(2, visible)).kind).toBe('Playback');
    expect(visible).not.toHaveBeenCalled();
    const linked = new StartRoute(() => true, { kind: 'Channel', query: '13' });
    expect((await linked.resolve(2, visible)).kind).toBe('DeepLink');
    expect(visible).toHaveBeenCalledTimes(1);
  });

  it('sends a fresh install with a link to the welcome flow, with the notice', () => {
    const route = new StartRoute(() => true, { kind: 'Channel', query: '13' });
    expect(route.forChannelCount(0)).toEqual({ kind: 'Welcome' });
    expect(route.notice.kind).toBe('NoSuchChannel');
  });
});

function channel(number: number, name: string): ChannelRow {
  return {
    id: number * 10,
    playlistId: 1,
    number,
    sortIndex: number,
    name,
    groupTitle: null,
    logoUrl: null,
    streamUrl: `http://h/${number}.ts`,
    tvgId: null,
    favorite: false,
    hidden: false,
    favoriteOrder: 0,
    blocked: false,
    catchupType: null,
    catchupSource: null,
    catchupDays: null,
    customName: null,
    audioDecoder: null,
    videoDecoder: null,
    epgOffsetMinutes: 0,
    externalPlayer: null,
    epgOverride: null,
  };
}
