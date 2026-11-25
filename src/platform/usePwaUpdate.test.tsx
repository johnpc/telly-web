import { act, fireEvent, render, screen } from '@testing-library/react';
import type { JSX } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { focusEngine } from '@/core/focus/focusEngine';
import { RemoteKeysProvider } from '@/core/input/RemoteKeysProvider';
import { digit } from '@/core/input/remoteKeys';
import { Navigator } from '@/core/navigation/navigator';
import { NavigatorContext } from '@/core/navigation/navigatorContext';
import type { RouteKind } from '@/core/navigation/routes';
import { PwaUpdate, SKIP_WAITING, type UpdateHost, type UpdateWorker } from './pwaUpdate';
import { PwaUpdateToastScreen } from './PwaUpdateToastScreen';
import { UPDATE_TOAST_RELOADING, UPDATE_TOAST_TITLE, toastFor } from './usePwaUpdate';

const PAGE = 'aaaa0001';

/** A machine already offering a newer worker, plus the registration to push further installs through. */
function readyMachine(machine = new PwaUpdate()) {
  const worker: UpdateWorker & { postMessage: ReturnType<typeof vi.fn> } = Object.assign(new EventTarget(), {
    scriptURL: '/sw.js?v=bbbb0002',
    state: 'installed' as ServiceWorkerState,
    postMessage: vi.fn(),
  });
  const host: UpdateHost & { container: EventTarget; reload: Mock<() => void> } = {
    container: Object.assign(new EventTarget(), { controller: {} as ServiceWorker }),
    document: Object.assign(new EventTarget(), { visibilityState: 'visible' as DocumentVisibilityState }),
    version: PAGE,
    liveVersion: () => Promise.resolve(null),
    register: () => Promise.resolve(),
    reload: vi.fn<() => void>(),
  };
  const registration = Object.assign(new EventTarget(), { installing: null, waiting: worker });
  const stop = machine.watch(host, registration);
  return { machine, worker, host, stop };
}

describe('toastFor', () => {
  const { machine } = readyMachine();
  const ready = machine.state;

  it('shows nothing while the shell is current', () => {
    expect(toastFor({ kind: 'Current' }, 'Guide', machine)).toBeNull();
  });

  it('waits while fullscreen video or the Boot frame is on screen, shows elsewhere', () => {
    for (const route of ['Boot', 'Playback', 'VodPlayback', 'Multiview'] as RouteKind[]) {
      expect(toastFor(ready, route, machine)).toBeNull();
    }
    for (const route of ['Guide', 'Settings', 'Welcome', 'Search', 'Vod', 'Exited'] as RouteKind[]) {
      expect(toastFor(ready, route, machine)?.phase).toBe('ready');
    }
  });

  it('OK reloads, BACK and arrows dismiss, other keys fall through', () => {
    const m = new PwaUpdate();
    const reload = vi.spyOn(m, 'reload').mockImplementation(() => undefined);
    const dismiss = vi.spyOn(m, 'dismiss').mockImplementation(() => undefined);
    const toast = toastFor(ready, 'Guide', m);
    expect(toast?.onKey('OK')).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    for (const key of ['BACK', 'UP', 'DOWN', 'LEFT', 'RIGHT'] as const) expect(toast?.onKey(key)).toBe(true);
    expect(dismiss).toHaveBeenCalledTimes(5);
    expect(toast?.onKey('MENU')).toBe(false);
    expect(toast?.onKey(digit(3))).toBe(false);
    toast?.reload();
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('names the reloading phase', () => {
    const state = { kind: 'Reloading', fallback: setTimeout(() => undefined, 0) } as const;
    expect(toastFor(state, 'Guide', machine)?.phase).toBe('reloading');
    clearTimeout(state.fallback);
  });
});

function Host({
  machine,
  route = 'Guide' as RouteKind,
}: {
  machine: PwaUpdate;
  route?: RouteKind;
}): JSX.Element {
  const navigator = new Navigator({ kind: route } as never);
  return (
    <NavigatorContext value={navigator}>
      <RemoteKeysProvider onBack={() => undefined}>
        <PwaUpdateToastScreen machine={machine} />
      </RemoteKeysProvider>
    </NavigatorContext>
  );
}

describe('PwaUpdateToastScreen', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders nothing while current, and nothing over fullscreen playback even when an update waits', () => {
    const machine = new PwaUpdate();
    const { rerender } = render(<Host machine={machine} />);
    expect(screen.queryByTestId('pwa-update-toast')).toBeNull();
    act(() => {
      readyMachine(machine);
    });
    rerender(<Host machine={machine} route="Playback" />);
    expect(screen.queryByTestId('pwa-update-toast')).toBeNull();
  });

  it('takes focus when it appears; BACK puts it away', () => {
    const machine = new PwaUpdate();
    render(<Host machine={machine} />);
    act(() => {
      readyMachine(machine);
    });
    const toast = screen.getByTestId('pwa-update-toast');
    expect(toast).toHaveTextContent(UPDATE_TOAST_TITLE);
    expect(toast).toHaveTextContent('OK: reload · BACK: later');
    expect(toast).toHaveAttribute('data-phase', 'ready');
    expect(focusEngine.current).toBe('pwa-update-toast');
    expect(toast).toHaveAttribute('data-focused', 'true');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('pwa-update-toast')).toBeNull();
    expect(machine.state.kind).toBe('Current');
  });

  it('OK asks the waiting worker to take over and shows the reloading line until the page goes', () => {
    const machine = new PwaUpdate();
    render(<Host machine={machine} />);
    let ready: ReturnType<typeof readyMachine> | undefined;
    act(() => {
      ready = readyMachine(machine);
    });
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyUp(window, { key: 'Enter' });
    expect(ready?.worker.postMessage).toHaveBeenCalledWith(SKIP_WAITING);
    const toast = screen.getByTestId('pwa-update-toast');
    expect(toast).toHaveAttribute('data-phase', 'reloading');
    expect(toast).toHaveTextContent(UPDATE_TOAST_RELOADING);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(machine.state.kind).toBe('Reloading');
    act(() => {
      ready?.host.container.dispatchEvent(new Event('controllerchange'));
    });
    expect(ready?.host.reload).toHaveBeenCalledTimes(1);
  });
});
