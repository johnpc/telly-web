import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
  PwaUpdate,
  RELOAD_FALLBACK_MS,
  SKIP_WAITING,
  UPDATE_CHECK_MS,
  type UpdateHost,
  type UpdateRegistration,
  type UpdateWorker,
} from './pwaUpdate';

/** A worker that installs on command; `postMessage` is recorded. */
class FakeWorker extends EventTarget implements UpdateWorker {
  state: ServiceWorkerState = 'installing';
  readonly postMessage = vi.fn();
  constructor(readonly scriptURL: string) {
    super();
  }
  install(): void {
    this.state = 'installed';
    this.dispatchEvent(new Event('statechange'));
  }
}

class FakeRegistration extends EventTarget implements UpdateRegistration {
  installing: FakeWorker | null = null;
  waiting: FakeWorker | null = null;
  /** The browser found a newer script: `installing` is set, then `updatefound` fires. */
  found(worker: FakeWorker): FakeWorker {
    this.installing = worker;
    this.dispatchEvent(new Event('updatefound'));
    return worker;
  }
}

interface FakeHost extends UpdateHost {
  readonly container: EventTarget & { controller: ServiceWorker | null };
  readonly document: EventTarget & { visibilityState: DocumentVisibilityState };
  readonly liveVersion: Mock<() => Promise<string | null>>;
  readonly register: Mock<(version: string) => Promise<unknown>>;
  readonly reload: Mock<() => void>;
}

const PAGE = 'aaaa0001';
const NEWER = 'bbbb0002';

function fakeHost(controller: ServiceWorker | null = {} as ServiceWorker): FakeHost {
  return {
    container: Object.assign(new EventTarget(), { controller }),
    document: Object.assign(new EventTarget(), { visibilityState: 'visible' as DocumentVisibilityState }),
    version: PAGE,
    liveVersion: vi.fn<() => Promise<string | null>>().mockResolvedValue(null),
    register: vi.fn<(version: string) => Promise<unknown>>().mockResolvedValue(undefined),
    reload: vi.fn<() => void>(),
  };
}

function watched(host = fakeHost()): { machine: PwaUpdate; registration: FakeRegistration; stop(): void } {
  const machine = new PwaUpdate();
  const registration = new FakeRegistration();
  const stop = machine.watch(host, registration);
  return { machine, registration, stop };
}

describe('PwaUpdate: installs', () => {
  it('ignores the very first install (nothing controls the page yet)', () => {
    const { machine, registration } = watched(fakeHost(null));
    const worker = registration.found(new FakeWorker(`/sw.js?v=${PAGE}`));
    worker.install();
    expect(machine.state.kind).toBe('Current');
    expect(worker.postMessage).not.toHaveBeenCalled();
  });

  it('lets a same-version worker take over quietly (only sw.js itself changed)', () => {
    const { machine, registration } = watched();
    const worker = registration.found(new FakeWorker(`/sw.js?v=${PAGE}`));
    worker.install();
    expect(worker.postMessage).toHaveBeenCalledWith(SKIP_WAITING);
    expect(machine.state.kind).toBe('Current');
  });

  it('offers a reload when a worker for a newer shell finished installing', () => {
    const { machine, registration } = watched();
    const worker = registration.found(new FakeWorker(`/sw.js?v=${NEWER}`));
    const seen = vi.fn();
    machine.subscribe(seen);
    expect(machine.state.kind).toBe('Current');
    worker.install();
    expect(machine.state).toEqual({ kind: 'UpdateReady', worker });
    expect(worker.postMessage).not.toHaveBeenCalled();
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('treats a worker already waiting when watching starts the same way', () => {
    const machine = new PwaUpdate();
    const registration = new FakeRegistration();
    registration.waiting = Object.assign(new FakeWorker(`/sw.js?v=${NEWER}`), {
      state: 'installed' as const,
    });
    machine.watch(fakeHost(), registration);
    expect(machine.state.kind).toBe('UpdateReady');
  });

  it('ignores a found update whose installing worker is already gone', () => {
    const { machine, registration } = watched();
    registration.dispatchEvent(new Event('updatefound'));
    expect(machine.state.kind).toBe('Current');
  });
});

describe('PwaUpdate: reload and dismiss', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function ready(): ReturnType<typeof watched> & { host: FakeHost; worker: FakeWorker } {
    const host = fakeHost();
    const w = watched(host);
    const worker = w.registration.found(new FakeWorker(`/sw.js?v=${NEWER}`));
    worker.install();
    return { ...w, host, worker };
  }

  it('OK: posts skipWaiting, reloads on controllerchange and drops the fallback', () => {
    const { machine, host, worker } = ready();
    machine.reload();
    expect(machine.state.kind).toBe('Reloading');
    expect(worker.postMessage).toHaveBeenCalledWith(SKIP_WAITING);
    expect(host.reload).not.toHaveBeenCalled();
    host.container.dispatchEvent(new Event('controllerchange'));
    expect(host.reload).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(RELOAD_FALLBACK_MS * 2);
    expect(host.reload).toHaveBeenCalledTimes(1);
  });

  it('reloads anyway when controllerchange never comes', () => {
    const { machine, host } = ready();
    machine.reload();
    vi.advanceTimersByTime(RELOAD_FALLBACK_MS - 1);
    expect(host.reload).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(host.reload).toHaveBeenCalledTimes(1);
  });

  it('BACK: returns to Current; reload is then a no-op and a reload request needs a new install', () => {
    const { machine, host, worker } = ready();
    machine.dismiss();
    expect(machine.state.kind).toBe('Current');
    machine.reload();
    expect(worker.postMessage).not.toHaveBeenCalled();
    host.container.dispatchEvent(new Event('controllerchange'));
    expect(host.reload).not.toHaveBeenCalled();
    machine.dismiss();
    expect(machine.state.kind).toBe('Current');
  });

  it('a controllerchange outside Reloading (the quiet take-over) never reloads', () => {
    const host = fakeHost();
    const { registration } = watched(host);
    registration.found(new FakeWorker(`/sw.js?v=${PAGE}`)).install();
    host.container.dispatchEvent(new Event('controllerchange'));
    expect(host.reload).not.toHaveBeenCalled();
  });

  it('is inert before anything is watched', () => {
    const machine = new PwaUpdate();
    machine.reload();
    machine.dismiss();
    expect(machine.state.kind).toBe('Current');
  });
});

describe('PwaUpdate: checking for a newer deploy', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('registers the deployed version when it differs from the page, and only then', async () => {
    const host = fakeHost();
    const { machine } = watched(host);
    await machine.check();
    host.liveVersion.mockResolvedValue(PAGE);
    await machine.check();
    expect(host.register).not.toHaveBeenCalled();
    host.liveVersion.mockResolvedValue(NEWER);
    await machine.check();
    expect(host.register).toHaveBeenCalledWith(NEWER);
  });

  it('checks on the interval and whenever the page becomes visible; stop ends both', async () => {
    const host = fakeHost();
    const { stop } = watched(host);
    expect(host.liveVersion).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(UPDATE_CHECK_MS);
    expect(host.liveVersion).toHaveBeenCalledTimes(1);
    host.document.dispatchEvent(new Event('visibilitychange'));
    expect(host.liveVersion).toHaveBeenCalledTimes(2);
    host.document.visibilityState = 'hidden';
    host.document.dispatchEvent(new Event('visibilitychange'));
    expect(host.liveVersion).toHaveBeenCalledTimes(2);
    stop();
    host.document.visibilityState = 'visible';
    host.document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(UPDATE_CHECK_MS * 3);
    expect(host.liveVersion).toHaveBeenCalledTimes(2);
  });

  it('stop also detaches from the registration and the container', () => {
    const host = fakeHost();
    const { machine, registration, stop } = watched(host);
    stop();
    registration.found(new FakeWorker(`/sw.js?v=${NEWER}`)).install();
    expect(machine.state.kind).toBe('Current');
  });

  it('a machine nobody watched has nothing to check', async () => {
    const machine = new PwaUpdate();
    await expect(machine.check()).resolves.toBeUndefined();
  });
});
