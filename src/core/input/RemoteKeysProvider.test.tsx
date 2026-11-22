import { act, fireEvent, render, renderHook } from '@testing-library/react';
import type { JSX } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FocusEngine } from '../focus/focusEngine';
import { useKeyRouter } from './keyRouterContext';
import { RemoteKeysProvider } from './RemoteKeysProvider';
import type { RemoteKey } from './remoteKeys';
import { useKeyHandler } from './useKeyHandler';

function Listener({ name, log, consume = true, enabled = true }: ListenerProps): JSX.Element {
  useKeyHandler((key) => {
    log.push(`${name}:${String(key)}`);
    return consume;
  }, enabled);
  return <span data-testid={name} />;
}

interface ListenerProps {
  name: string;
  log: string[];
  consume?: boolean;
  enabled?: boolean;
}

describe('RemoteKeysProvider + useKeyHandler', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('routes window keys to the most recently mounted handler first', () => {
    const log: string[] = [];
    const onBack = vi.fn();
    const { rerender } = render(
      <RemoteKeysProvider onBack={onBack}>
        <Listener name="screen" log={log} consume={false} />
      </RemoteKeysProvider>,
    );
    fireEvent.keyDown(window, { key: 'm' });
    expect(log).toEqual(['screen:MENU']);
    rerender(
      <RemoteKeysProvider onBack={onBack}>
        <Listener name="screen" log={log} consume={false} />
        <Listener name="overlay" log={log} />
      </RemoteKeysProvider>,
    );
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(log).toEqual(['screen:MENU', 'overlay:UP']);
    rerender(
      <RemoteKeysProvider onBack={onBack}>
        <Listener name="screen" log={log} consume={false} />
      </RemoteKeysProvider>,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(log).toEqual(['screen:MENU', 'overlay:UP', 'screen:BACK']);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('skips a disabled handler and re-points BACK when onBack changes', () => {
    const log: string[] = [];
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <RemoteKeysProvider onBack={first}>
        <Listener name="off" log={log} enabled={false} />
      </RemoteKeysProvider>,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(log).toEqual([]);
    expect(first).toHaveBeenCalledTimes(1);
    rerender(
      <RemoteKeysProvider onBack={second}>
        <Listener name="off" log={log} enabled={false} />
      </RemoteKeysProvider>,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('falls through arrows and OK (keyboard or gamepad) to the focus engine', () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb));
    Object.defineProperty(navigator, 'getGamepads', {
      configurable: true,
      value: () => [{ buttons: [{ pressed: true }], axes: [0, 0] }],
    });
    const engine = new FocusEngine((work) => work());
    const move = vi.spyOn(engine, 'move');
    const activate = vi.spyOn(engine, 'activate');
    render(<RemoteKeysProvider onBack={() => undefined} engine={engine} />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(move).toHaveBeenCalledWith('RIGHT');
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyUp(window, { key: 'Enter' });
    expect(activate).toHaveBeenCalledTimes(1);
    frames.shift()?.(16);
    expect(activate).toHaveBeenCalledTimes(2);
    Reflect.deleteProperty(navigator, 'getGamepads');
  });

  it('always calls the latest handler closure without re-pushing', () => {
    const seen: RemoteKey[][] = [[], []];
    function Latest({ slot }: { slot: number }): JSX.Element {
      useKeyHandler((key) => {
        seen[slot]?.push(key);
        return true;
      });
      return <span />;
    }
    const { rerender } = render(
      <RemoteKeysProvider onBack={() => undefined}>
        <Latest slot={0} />
      </RemoteKeysProvider>,
    );
    rerender(
      <RemoteKeysProvider onBack={() => undefined}>
        <Latest slot={1} />
      </RemoteKeysProvider>,
    );
    act(() => {
      fireEvent.keyDown(window, { key: 'p' });
    });
    expect(seen).toEqual([[], ['PLAY_PAUSE']]);
  });

  it('useKeyRouter throws outside the provider', () => {
    expect(() => renderHook(() => useKeyRouter())).toThrow(/RemoteKeysProvider/);
  });
});
