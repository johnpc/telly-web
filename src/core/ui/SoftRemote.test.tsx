import { act, fireEvent, render, screen } from '@testing-library/react';
import type { JSX } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HOLD_MS } from '../input/holdKeyDetector';
import { RemoteKeysProvider } from '../input/RemoteKeysProvider';
import type { RemoteKey } from '../input/remoteKeys';
import { useKeyHandler } from '../input/useKeyHandler';
import { SoftRemote } from './SoftRemote';

function Recorder({ log }: { log: RemoteKey[] }): JSX.Element {
  useKeyHandler((key) => {
    log.push(key);
    return true;
  });
  return <SoftRemote />;
}

function stubCoarsePointer(matches: boolean): void {
  window.matchMedia = vi.fn(
    () =>
      ({
        matches,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
}

describe('SoftRemote', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, 'matchMedia');
  });

  function mount(): RemoteKey[] {
    const log: RemoteKey[] = [];
    render(
      <RemoteKeysProvider onBack={() => undefined}>
        <Recorder log={log} />
      </RemoteKeysProvider>,
    );
    return log;
  }

  it('renders nothing on a non-touch device', () => {
    stubCoarsePointer(false);
    mount();
    expect(screen.queryByTestId('soft-remote')).toBeNull();
  });

  it('dispatches every pad key into the router on a touch device', () => {
    stubCoarsePointer(true);
    const log = mount();
    expect(screen.getByTestId('soft-remote')).toHaveAttribute('data-state', 'open');
    for (const name of ['Up', 'Down', 'Left', 'Right', 'Back', 'Channel up', 'Channel down', 'Menu']) {
      fireEvent.click(screen.getByRole('button', { name }));
    }
    expect(log).toEqual(['UP', 'DOWN', 'LEFT', 'RIGHT', 'BACK', 'CHANNEL_UP', 'CHANNEL_DOWN', 'MENU']);
  });

  it('OK taps fire OK; press-and-hold fires LONG_OK; leaving cancels', () => {
    stubCoarsePointer(true);
    const log = mount();
    const ok = screen.getByRole('button', { name: 'OK' });
    fireEvent.pointerDown(ok);
    fireEvent.pointerUp(ok);
    expect(log).toEqual(['OK']);
    fireEvent.pointerDown(ok);
    act(() => vi.advanceTimersByTime(HOLD_MS));
    fireEvent.pointerUp(ok);
    expect(log).toEqual(['OK', 'LONG_OK']);
    fireEvent.pointerDown(ok);
    fireEvent.pointerLeave(ok);
    fireEvent.pointerDown(ok);
    fireEvent.pointerCancel(ok);
    act(() => vi.advanceTimersByTime(HOLD_MS));
    expect(log).toEqual(['OK', 'LONG_OK']);
  });

  it('toggles the pad and keeps DOM focus where it was', () => {
    stubCoarsePointer(true);
    mount();
    const probe = document.createElement('button');
    document.body.appendChild(probe);
    probe.focus();
    const pad = screen.getByTestId('soft-remote');
    const down = fireEvent.pointerDown(pad);
    expect(down).toBe(false);
    fireEvent.click(screen.getByTestId('soft-remote-toggle'));
    expect(pad).toHaveAttribute('data-state', 'closed');
    expect(screen.queryByRole('button', { name: 'OK' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Show remote' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('soft-remote-toggle'));
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
    expect(probe).toHaveFocus();
  });
});
