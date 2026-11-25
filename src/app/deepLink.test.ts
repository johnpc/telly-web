import { describe, expect, it, vi } from 'vitest';
import type { ChannelRow } from '@/core/db/types';
import { launchLinkOf, matchChannel, NO_LINK, takeLaunchLink, withoutLaunchLink } from './deepLink';

function channel(number: number, name: string, customName: string | null = null): ChannelRow {
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
    customName,
    audioDecoder: null,
    videoDecoder: null,
    epgOffsetMinutes: 0,
    externalPlayer: null,
    epgOverride: null,
  };
}

const CHANNELS = [
  channel(1, 'News One'),
  channel(2, 'News One HD'),
  channel(13, 'Movie House'),
  channel(16, 'Movie House Extra'),
  channel(24, 'Kids Zone', 'Cartoons'),
];

describe('launchLinkOf', () => {
  it('reads a trimmed ?channel= request and ignores a blank or absent one', () => {
    expect(launchLinkOf('?channel=Movie%20House&e2e=1')).toEqual({ kind: 'Channel', query: 'Movie House' });
    expect(launchLinkOf('?channel=%2013%20')).toEqual({ kind: 'Channel', query: '13' });
    expect(launchLinkOf('?channel=')).toEqual(NO_LINK);
    expect(launchLinkOf('?e2e=1')).toEqual(NO_LINK);
    expect(launchLinkOf('')).toEqual(NO_LINK);
  });
});

describe('withoutLaunchLink', () => {
  it('drops only the channel param and keeps the base path, other params and the hash', () => {
    expect(withoutLaunchLink({ pathname: '/', search: '?channel=13', hash: '' })).toBe('/');
    expect(withoutLaunchLink({ pathname: '/', search: '?e2e=1&channel=News+One', hash: '' })).toBe('/?e2e=1');
    expect(withoutLaunchLink({ pathname: '/telly-web/', search: '?channel=13&e2e=1', hash: '#x' })).toBe(
      '/telly-web/?e2e=1#x',
    );
  });
});

describe('takeLaunchLink', () => {
  it('returns the request and rewrites the address bar once, preserving the history state', () => {
    const replaceState = vi.fn();
    const win = {
      location: { pathname: '/telly-web/', search: '?e2e=1&channel=13', hash: '' } as Location,
      history: { state: { tellyDepth: 1 }, replaceState } as unknown as History,
    };
    expect(takeLaunchLink(win)).toEqual({ kind: 'Channel', query: '13' });
    expect(replaceState).toHaveBeenCalledWith({ tellyDepth: 1 }, '', '/telly-web/?e2e=1');
  });

  it('leaves the address bar alone when there is no link', () => {
    const replaceState = vi.fn();
    const win = {
      location: { pathname: '/', search: '?e2e=1', hash: '' } as Location,
      history: { state: null, replaceState } as unknown as History,
    };
    expect(takeLaunchLink(win)).toEqual(NO_LINK);
    expect(replaceState).not.toHaveBeenCalled();
  });
});

describe('matchChannel', () => {
  it('matches a channel number first', () => {
    expect(matchChannel(CHANNELS, '13')?.name).toBe('Movie House');
    expect(matchChannel(CHANNELS, ' 16 ')?.name).toBe('Movie House Extra');
  });
  it('matches the exact display name case-insensitively, custom names included', () => {
    expect(matchChannel(CHANNELS, 'movie house')?.number).toBe(13);
    expect(matchChannel(CHANNELS, 'NEWS ONE')?.number).toBe(1);
    expect(matchChannel(CHANNELS, 'cartoons')?.number).toBe(24);
    expect(matchChannel(CHANNELS, 'Kids Zone')).toBeNull();
  });
  it('matches a unique name prefix and refuses an ambiguous one', () => {
    expect(matchChannel(CHANNELS, 'movie house e')?.number).toBe(16);
    expect(matchChannel(CHANNELS, 'Movie')).toBeNull();
    expect(matchChannel(CHANNELS, 'Nope')).toBeNull();
    expect(matchChannel([], '1')).toBeNull();
  });
  it('falls through to names when a numeric query is a channel name, not a number', () => {
    expect(matchChannel([channel(5, '24')], '24')?.number).toBe(5);
  });
});
