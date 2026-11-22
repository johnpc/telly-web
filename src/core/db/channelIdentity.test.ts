import { describe, expect, it } from 'vitest';
import { identityOf, keyOf } from './channelIdentity';
import { displayName, epgId } from './types';

describe('channel identity + derived helpers', () => {
  it('prefers a non-blank tvg-id, else url|name', () => {
    expect(identityOf('abc', 'http://s', 'N')).toBe('abc');
    expect(identityOf('  ', 'http://s', 'N')).toBe('http://s|N');
    expect(identityOf(null, 'http://s', 'N')).toBe('http://s|N');
    expect(identityOf(undefined, 'http://s', 'N')).toBe('http://s|N');
    expect(keyOf({ tvgId: null, streamUrl: 'u', name: 'n' })).toBe('u|n');
  });

  it('displayName renders the custom name when set and non-blank', () => {
    expect(displayName({ name: 'CNN', customName: null })).toBe('CNN');
    expect(displayName({ name: 'CNN', customName: '  ' })).toBe('CNN');
    expect(displayName({ name: 'CNN', customName: 'News' })).toBe('News');
  });

  it('epgId is the override, else the tvg-id', () => {
    expect(epgId({ tvgId: 'a', epgOverride: null })).toBe('a');
    expect(epgId({ tvgId: 'a', epgOverride: 'b' })).toBe('b');
    expect(epgId({ tvgId: null, epgOverride: null })).toBeNull();
  });
});
