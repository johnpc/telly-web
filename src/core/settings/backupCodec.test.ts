import { describe, expect, it } from 'vitest';
import { decodeBackup, encodeBackup, type BackupPayload } from './backupCodec';

const payload: BackupPayload = {
  version: 1,
  settings: { epg_past_days_to_keep: '3', general_confirm_exit: 'true' },
  playlists: [{ name: 'Home', url: 'http://p/x.m3u', epgUrl: 'http://p/e.xml' }],
};

describe('backupCodec (Android BackupCodec shape)', () => {
  it('round-trips and carries the version marker', () => {
    const json = encodeBackup(payload);
    expect(json).toContain('"version"');
    expect(decodeBackup(json)).toEqual(payload);
  });

  it('decodes an Android-produced file (kotlinx pretty print, null epgUrl)', () => {
    const android = `{
    "version": 1,
    "settings": {
        "general_confirm_exit": "true"
    },
    "playlists": [
        {
            "name": "n",
            "url": "u",
            "epgUrl": null
        }
    ]
}`;
    expect(decodeBackup(android)).toEqual({
      version: 1,
      settings: { general_confirm_exit: 'true' },
      playlists: [{ name: 'n', url: 'u', epgUrl: null }],
    });
  });

  it('foreign or corrupt text decodes to null', () => {
    expect(decodeBackup('not json')).toBeNull();
    expect(decodeBackup('{"something":"else"}')).toBeNull();
    expect(decodeBackup('[]')).toBeNull();
    expect(decodeBackup('{"version":"1","settings":{},"playlists":[]}')).toBeNull();
    expect(decodeBackup('{"settings":{"a":1},"playlists":[]}')).toBeNull();
    expect(decodeBackup('{"settings":[],"playlists":[]}')).toBeNull();
    expect(decodeBackup('{"settings":{},"playlists":{}}')).toBeNull();
    expect(decodeBackup('{"settings":{},"playlists":[{"name":"n"}]}')).toBeNull();
    expect(decodeBackup('{"settings":{},"playlists":[{"name":"n","url":"u","epgUrl":5}]}')).toBeNull();
  });

  it('ignores unknown fields and defaults the version', () => {
    expect(decodeBackup('{"settings":{},"playlists":[],"future":"field"}')).toEqual({
      version: 1,
      settings: {},
      playlists: [],
    });
  });

  it('playlist epg url is optional', () => {
    const decoded = decodeBackup('{"version":1,"settings":{},"playlists":[{"name":"n","url":"u"}]}');
    expect(decoded?.playlists).toEqual([{ name: 'n', url: 'u', epgUrl: null }]);
  });
});
