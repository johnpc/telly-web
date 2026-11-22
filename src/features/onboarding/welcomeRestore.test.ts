import { describe, expect, it } from 'vitest';
import { encodeBackup } from '@/core/settings/backupCodec';
import { offerOf } from './welcomeRestore';

const backupJson = encodeBackup({ version: 1, settings: { k: 'v' }, playlists: [] });

describe('WelcomeRestore.offerOf', () => {
  it('offers a readable telly backup directly', () => {
    expect(offerOf(backupJson, true, false)).toEqual({ kind: 'Ready', json: backupJson });
  });
  it('a sighted-but-unreadable file needs the access grant', () => {
    expect(offerOf(null, true, true)).toEqual({ kind: 'NeedsAccess' });
  });
  it('non-telly JSON never offers a restore', () => {
    expect(offerOf('{"not":"telly"}', false, false)).toEqual({ kind: 'None' });
  });
  it('nothing sighted or no grantable access is the plain welcome', () => {
    expect(offerOf(null, false, true)).toEqual({ kind: 'None' });
    expect(offerOf(null, true, false)).toEqual({ kind: 'None' });
  });
});
