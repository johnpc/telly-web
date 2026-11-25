import { describe, expect, it, vi } from 'vitest';
import {
  BUFFERING,
  ENDED,
  EngineStateStore,
  errorState,
  IDLE,
  isStreaming,
  PLAYING,
  reconnecting,
  sameState,
} from './engineState';

describe('EngineState', () => {
  it('streams while Buffering, Playing or Reconnecting and nowhere else', () => {
    expect(isStreaming(BUFFERING)).toBe(true);
    expect(isStreaming(PLAYING)).toBe(true);
    expect(isStreaming(reconnecting(1, 0))).toBe(true);
    expect(isStreaming(IDLE)).toBe(false);
    expect(isStreaming(ENDED)).toBe(false);
    expect(isStreaming(errorState('boom'))).toBe(false);
  });

  it('compares structurally, including the payload of Error and Reconnecting', () => {
    expect(sameState(PLAYING, PLAYING)).toBe(true);
    expect(sameState(PLAYING, BUFFERING)).toBe(false);
    expect(sameState(errorState('a'), errorState('a'))).toBe(true);
    expect(sameState(errorState('a'), errorState('b'))).toBe(false);
    expect(sameState(reconnecting(1, 2), reconnecting(1, 2))).toBe(true);
    expect(sameState(reconnecting(1, 2), reconnecting(2, 2))).toBe(false);
    expect(sameState(reconnecting(1, 2), reconnecting(1, 3))).toBe(false);
  });
});

describe('EngineStateStore', () => {
  it('starts Idle, notifies on distinct writes only and keeps the snapshot stable', () => {
    const store = new EngineStateStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    expect(store.get()).toBe(IDLE);

    store.set(BUFFERING);
    const snapshot = store.get();
    store.set(BUFFERING);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.get()).toBe(snapshot);

    store.set(errorState('x'));
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    store.set(PLAYING);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
