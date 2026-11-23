import { describe, expect, it } from 'vitest';
import type { SimpleRemoteKey } from '@/core/input/remoteKeys';
import type { PlaybackOverlay } from '@/features/playback/overlay/playbackOverlay';
import {
  type CatchupMode,
  type CatchupSeekKeys,
  DEFAULT_SEEK_KEYS,
  catchupCommandFor,
} from './catchupKeyPolicy';
import { DEFAULT_SKIP } from './skipSteps';

const NONE: PlaybackOverlay = { kind: 'None' };
const INFO: PlaybackOverlay = { kind: 'Info' };
const TRANSPORT: PlaybackOverlay = { kind: 'InfoTransport' };
const ZAP: PlaybackOverlay = { kind: 'ZapInfo' };
const PANEL: PlaybackOverlay = { kind: 'Panel' };
const QUICK: PlaybackOverlay = { kind: 'QuickBar' };
const ALL: CatchupSeekKeys = {
  rwFf: true,
  leftRight: true,
  downUp: true,
  rwLive: true,
  leftLive: true,
  downLive: true,
};

const at = (overlay: PlaybackOverlay, key: SimpleRemoteKey, mode: CatchupMode, keys = DEFAULT_SEEK_KEYS) =>
  catchupCommandFor(overlay, key, mode, keys, DEFAULT_SKIP);

describe('catchupCommandFor', () => {
  it('declines everything outside catch-up context and inside sticky layers', () => {
    expect(at(NONE, 'REWIND', 'None', ALL)).toBeNull();
    expect(at(PANEL, 'REWIND', 'Playing', ALL)).toBeNull();
    expect(at(QUICK, 'FAST_FORWARD', 'Playing', ALL)).toBeNull();
    expect(at(PANEL, 'REWIND', 'LiveCapable', ALL)).toBeNull();
  });
  it('seeks with RW/FF over bare playback and the transient overlays while catch-up plays', () => {
    for (const overlay of [NONE, INFO, TRANSPORT, ZAP]) {
      expect(at(overlay, 'REWIND', 'Playing')).toEqual({ kind: 'Seek', deltaMs: -10_000 });
      expect(at(overlay, 'FAST_FORWARD', 'Playing')).toEqual({ kind: 'Seek', deltaMs: 30_000 });
    }
    expect(at(NONE, 'REWIND', 'Playing', { ...ALL, rwFf: false })).toBeNull();
  });
  it('D-pad seeks and BACK apply at bare catch-up playback only, per the toggles', () => {
    expect(at(NONE, 'LEFT', 'Playing', ALL)).toEqual({ kind: 'Seek', deltaMs: -10_000 });
    expect(at(NONE, 'RIGHT', 'Playing', ALL)).toEqual({ kind: 'Seek', deltaMs: 30_000 });
    expect(at(NONE, 'DOWN', 'Playing', ALL)).toEqual({ kind: 'Seek', deltaMs: -10_000 });
    expect(at(NONE, 'UP', 'Playing', ALL)).toEqual({ kind: 'Seek', deltaMs: 30_000 });
    expect(at(NONE, 'BACK', 'Playing')).toEqual({ kind: 'Back' });
    expect(at(NONE, 'OK', 'Playing', ALL)).toBeNull();
    expect(at(NONE, 'LEFT', 'Playing')).toBeNull();
    expect(at(NONE, 'UP', 'Playing')).toBeNull();
    expect(at(INFO, 'LEFT', 'Playing', ALL)).toBeNull();
    expect(at(INFO, 'BACK', 'Playing', ALL)).toBeNull();
  });
  it('rewinds live into catch-up on a capable channel per the rewinds-live toggles', () => {
    expect(at(INFO, 'REWIND', 'LiveCapable', ALL)).toEqual({ kind: 'RewindLive', deltaMs: 10_000 });
    expect(at(INFO, 'REWIND', 'LiveCapable')).toBeNull();
    expect(at(NONE, 'LEFT', 'LiveCapable', ALL)).toEqual({ kind: 'RewindLive', deltaMs: 10_000 });
    expect(at(NONE, 'DOWN', 'LiveCapable', ALL)).toEqual({ kind: 'RewindLive', deltaMs: 10_000 });
    expect(at(INFO, 'LEFT', 'LiveCapable', ALL)).toBeNull();
    expect(at(NONE, 'RIGHT', 'LiveCapable', ALL)).toBeNull();
    expect(at(NONE, 'LEFT', 'LiveCapable', { ...ALL, leftLive: false })).toBeNull();
    expect(at(NONE, 'DOWN', 'LiveCapable', { ...ALL, downLive: false })).toBeNull();
  });
});
