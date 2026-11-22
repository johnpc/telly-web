import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OverlayState } from './overlayState';
import { DEFAULT_PANEL_TIMEOUTS, panelTimeoutsForSeconds } from './panelTimeouts';
import {
  acceptsDigits,
  afterAction,
  INFO,
  isPushed,
  isTransient,
  NONE,
  PANEL,
  QUICK_BAR,
  ZAP_INFO,
} from './playbackOverlay';
import { InstantStore, Signal } from './signal';

describe('OverlayState', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('auto-hides a transient overlay after its timeout, re-armed by keepAlive, cancelled by set', () => {
    const state = new OverlayState();
    const seen: string[] = [];
    state.subscribe(() => seen.push(state.value.kind));
    state.showAutoHiding(INFO, 1000);
    vi.advanceTimersByTime(800);
    state.keepAlive();
    vi.advanceTimersByTime(800);
    expect(state.value).toBe(INFO);
    vi.advanceTimersByTime(300);
    expect(state.value).toBe(NONE);
    state.showAutoHiding(QUICK_BAR, 500);
    state.set(PANEL);
    vi.advanceTimersByTime(1000);
    expect(state.value).toBe(PANEL);
    state.keepAlive();
    state.showAutoHiding(ZAP_INFO, 500);
    state.showAutoHiding(INFO, 500);
    vi.advanceTimersByTime(600);
    expect(state.value).toBe(NONE);
    expect(seen).toEqual(['Info', 'None', 'QuickBar', 'Panel', 'ZapInfo', 'Info', 'None']);
    state.showAutoHiding(INFO, 500);
    state.dispose();
    vi.advanceTimersByTime(600);
    expect(state.value).toBe(INFO);
  });
});

describe('playbackOverlay helpers', () => {
  it('classifies overlays', () => {
    expect(isTransient(INFO)).toBe(true);
    expect(isTransient(PANEL)).toBe(false);
    expect(isPushed({ kind: 'ComingSoon', feature: 'x', back: NONE })).toBe(true);
    expect(isPushed(QUICK_BAR)).toBe(false);
    expect(acceptsDigits(ZAP_INFO)).toBe(true);
    expect(acceptsDigits(QUICK_BAR)).toBe(false);
    expect(afterAction({ kind: 'ChannelMenu', channelId: 1 })).toBe(PANEL);
    expect(afterAction(INFO)).toBe(NONE);
  });
});

describe('panelTimeouts', () => {
  it('maps the setting seconds onto the measured offsets', () => {
    expect(DEFAULT_PANEL_TIMEOUTS).toEqual({ infoMs: 5350, zapMs: 5500, quickBarMs: 5000 });
    expect(panelTimeoutsForSeconds(10).infoMs).toBe(10350);
    expect(panelTimeoutsForSeconds(0).quickBarMs).toBe(1000);
  });
});

describe('Signal / InstantStore', () => {
  it('bump versions and re-seed the instant from the clock', () => {
    const signal = new Signal();
    const seen = vi.fn();
    const stop = signal.subscribe(seen);
    signal.notify();
    expect(signal.value).toBe(1);
    expect(signal.getSnapshot()).toBe(1);
    stop();
    signal.notify();
    expect(seen).toHaveBeenCalledTimes(1);
    let now = 100;
    const instant = new InstantStore(() => now);
    expect(instant.value).toBe(100);
    now = 200;
    instant.refresh();
    expect(instant.getSnapshot()).toBe(200);
    expect(instant.changed.value).toBe(1);
    expect(new InstantStore().value).toBeGreaterThan(0);
  });
});
