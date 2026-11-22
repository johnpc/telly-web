import { describe, expect, it } from 'vitest';
import type { SimpleRemoteKey } from '@/core/input/remoteKeys';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { commandFor } from './playbackKeyPolicy';
import { INFO, INFO_TRANSPORT, NONE, PANEL, QUICK_BAR, ZAP_INFO } from './playbackOverlay';
import { DEFAULT_KEYMAP, keymapChoice, playerKeymapOf, type PlayerKeymap } from './playerKeymap';

const kinds = (overlay: Parameters<typeof commandFor>[0], keys: SimpleRemoteKey[], keymap?: PlayerKeymap) =>
  keys.map((key) => commandFor(overlay, key, keymap)?.kind ?? null);

describe('PlaybackKeyPolicy', () => {
  it('bare playback: OK/UP/DOWN info, long-OK/MENU quick-bar, CH± zap, BACK exits, LEFT/RIGHT/RW/FF nothing', () => {
    expect(
      kinds(NONE, [
        'OK',
        'UP',
        'DOWN',
        'LONG_OK',
        'MENU',
        'BACK',
        'LEFT',
        'RIGHT',
        'REWIND',
        'FAST_FORWARD',
        'PLAY_PAUSE',
      ]),
    ).toEqual([
      'ShowInfo',
      'ShowInfo',
      'ShowInfo',
      'OpenQuickBar',
      'OpenQuickBar',
      'ExitToGuide',
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(commandFor(NONE, 'CHANNEL_UP')).toEqual({ kind: 'Zap', delta: 1 });
    expect(commandFor(NONE, 'CHANNEL_DOWN')).toEqual({ kind: 'Zap', delta: -1 });
  });

  it('info overlay: UP expands once, DOWN opens the panel, BACK dismisses, CH± zap, OK/LEFT/RIGHT go to focus', () => {
    expect(kinds(INFO, ['UP', 'DOWN', 'BACK', 'MENU', 'LONG_OK', 'CHANNEL_UP', 'OK', 'LEFT'])).toEqual([
      'ShowTransport',
      'OpenPanel',
      'Dismiss',
      'OpenQuickBar',
      'OpenQuickBar',
      'Zap',
      null,
      null,
    ]);
    expect(commandFor(INFO_TRANSPORT, 'UP')).toBeNull();
    expect(commandFor(INFO_TRANSPORT, 'DOWN')?.kind).toBe('OpenPanel');
  });

  it('zap overlay promotes to info; sticky overlays only take BACK', () => {
    expect(kinds(ZAP_INFO, ['OK', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'LONG_OK', 'BACK', 'CHANNEL_DOWN'])).toEqual(
      ['ShowInfo', 'ShowInfo', 'ShowInfo', null, null, 'OpenQuickBar', 'Dismiss', 'Zap'],
    );
    expect(kinds(PANEL, ['BACK', 'OK', 'UP'])).toEqual(['Dismiss', null, null]);
    expect(kinds(QUICK_BAR, ['BACK', 'DOWN'])).toEqual(['Dismiss', null]);
    expect(commandFor({ kind: 'ChannelMenu', channelId: 1 }, 'BACK')?.kind).toBe('BackToPanel');
    expect(commandFor({ kind: 'ComingSoon', feature: 'x', back: PANEL }, 'BACK')).toEqual({
      kind: 'PopTo',
      overlay: PANEL,
    });
    expect(commandFor({ kind: 'ComingSoon', feature: 'x', back: PANEL }, 'OK')).toBeNull();
  });

  it('remaps follow the Remote control → Player settings', () => {
    const remapped: PlayerKeymap = {
      ok: 'Open channels list',
      upDown: 'Switch channels',
      leftRight: 'Switch channels',
      longOk: 'Open channels list',
    };
    expect(kinds(NONE, ['OK', 'LONG_OK'], remapped)).toEqual(['OpenPanel', 'OpenPanel']);
    expect(commandFor(NONE, 'UP', remapped)).toEqual({ kind: 'Zap', delta: 1 });
    expect(commandFor(NONE, 'LEFT', remapped)).toEqual({ kind: 'Zap', delta: -1 });
    expect(commandFor(ZAP_INFO, 'RIGHT', remapped)).toEqual({ kind: 'Zap', delta: 1 });
    const nothing: PlayerKeymap = { ...DEFAULT_KEYMAP, ok: 'Nothing', upDown: 'Nothing' };
    expect(kinds(NONE, ['OK', 'UP'], nothing)).toEqual([null, null]);
    expect(kinds(ZAP_INFO, ['OK', 'DOWN'], nothing)).toEqual(['ShowInfo', 'ShowInfo']);
  });

  it('playerKeymapOf reads the stored labels and falls back on garbage', () => {
    const settings = new SettingsRepository(
      new MemoryKeyValueStore({
        remote_player_ok: 'Nothing',
        remote_player_up_down: 'garbage',
        remote_player_long_ok: 'Open channels list',
      }),
    );
    expect(playerKeymapOf(settings)).toEqual({
      ok: 'Nothing',
      upDown: 'Show info panel',
      leftRight: 'Nothing',
      longOk: 'Open channels list',
    });
    expect(keymapChoice('x', ['a', 'b'], 'b')).toBe('b');
  });
});
