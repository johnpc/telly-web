// "telly was updated" — the one owner of the PWA update mode. A TV user can
// keep a stale shell running for days after a deploy: the app-shell worker
// (public/sw.js) serves hashed assets cache-first, and nothing navigates. This
// machine notices a newer deploy (a worker installed beside the controlling
// one for a DIFFERENT shell version), offers a reload, and performs it the
// one safe way: the new worker is told to `skipWaiting`, and the page reloads
// once `controllerchange` says it is in charge. Web-only: no Android peer.
import { Observable } from '@/core/state/observable';
import { workerVersion } from './shellVersion';

/** How often a running page compares the deployed shell with itself. */
export const UPDATE_CHECK_MS = 15 * 60_000;
/** A reload is never left hanging on a `controllerchange` that does not come. */
export const RELOAD_FALLBACK_MS = 4_000;
/** The message `public/sw.js` answers with `self.skipWaiting()`. */
export const SKIP_WAITING = { type: 'skipWaiting' } as const;

/** The slice of a `ServiceWorker` the machine touches; tests pass fakes. */
export type UpdateWorker = Pick<ServiceWorker, 'scriptURL' | 'state' | 'postMessage' | 'addEventListener'>;

/** The slice of a `ServiceWorkerRegistration` the machine watches. */
export type UpdateRegistration = Pick<
  ServiceWorkerRegistration,
  'addEventListener' | 'removeEventListener'
> & {
  readonly installing: UpdateWorker | null;
  readonly waiting: UpdateWorker | null;
};

/** What the machine needs from the browser; `pwa.ts` builds it from the window. */
export interface UpdateHost {
  readonly container: Pick<ServiceWorkerContainer, 'controller' | 'addEventListener' | 'removeEventListener'>;
  readonly document: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
  /** The shell version this page runs (`shellVersion(document)`). */
  readonly version: string;
  /** The deployed start document's version; null when unreadable. */
  liveVersion(): Promise<string | null>;
  /** Registers the worker for a version — a new URL, so a new worker installs. */
  register(version: string): Promise<unknown>;
  reload(): void;
}

// @stateMachine('PWA update')
/** Current · UpdateReady(worker) · Reloading(fallback) — the reload's safety timer lives IN the state. */
export type PwaUpdateState =
  | { readonly kind: 'Current' }
  | { readonly kind: 'UpdateReady'; readonly worker: UpdateWorker }
  | { readonly kind: 'Reloading'; readonly fallback: ReturnType<typeof setTimeout> };

export class PwaUpdate extends Observable {
  private current: PwaUpdateState = { kind: 'Current' };
  private host: UpdateHost | null = null;

  constructor(private readonly checkEveryMs: number = UPDATE_CHECK_MS) {
    super();
  }

  get state(): PwaUpdateState {
    return this.current;
  }

  /** Wires the registration's lifecycle and the periodic deploy check; returns the stop. */
  watch(host: UpdateHost, registration: UpdateRegistration): () => void {
    this.host = host;
    const onFound = (): void => this.onInstalling(registration.installing);
    const onController = (): void => this.onControllerChange();
    const onVisible = (): void => {
      if (host.document.visibilityState === 'visible') void this.check();
    };
    registration.addEventListener('updatefound', onFound);
    host.container.addEventListener('controllerchange', onController);
    host.document.addEventListener('visibilitychange', onVisible);
    if (registration.waiting !== null) this.onInstalled(registration.waiting);
    const ticker = setInterval(() => void this.check(), this.checkEveryMs);
    return () => {
      registration.removeEventListener('updatefound', onFound);
      host.container.removeEventListener('controllerchange', onController);
      host.document.removeEventListener('visibilitychange', onVisible);
      clearInterval(ticker);
    };
  }

  /** A newer deployed shell gets its worker registered; the browser then raises `updatefound`. */
  async check(): Promise<void> {
    if (this.host === null) return;
    const live = await this.host.liveVersion();
    if (live !== null && live !== this.host.version) await this.host.register(live);
  }

  /** OK on the toast: the new worker takes over, the page reloads once it controls it (or after the fallback). */
  reload(): void {
    if (this.current.kind !== 'UpdateReady' || this.host === null) return;
    const { worker } = this.current;
    const fallback = setTimeout(() => this.host?.reload(), RELOAD_FALLBACK_MS);
    this.set({ kind: 'Reloading', fallback });
    worker.postMessage(SKIP_WAITING);
  }

  /** BACK on the toast: the installed worker waits for the next launch; only a newer deploy asks again. */
  dismiss(): void {
    if (this.current.kind === 'UpdateReady') this.set({ kind: 'Current' });
  }

  private onInstalling(worker: UpdateWorker | null): void {
    if (worker === null) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') this.onInstalled(worker);
    });
  }

  /** Installed beside a controller: a stale page gets the toast; a page already on that version lets it take over quietly. */
  private onInstalled(worker: UpdateWorker): void {
    if (this.host === null || this.host.container.controller === null) return;
    if (workerVersion(worker.scriptURL) === this.host.version) {
      worker.postMessage(SKIP_WAITING);
      return;
    }
    this.set({ kind: 'UpdateReady', worker });
  }

  private onControllerChange(): void {
    if (this.current.kind !== 'Reloading') return;
    clearTimeout(this.current.fallback);
    this.host?.reload();
  }

  private set(next: PwaUpdateState): void {
    this.current = next;
    this.notify();
  }
}

/** The app-wide machine; `applyPwaPlan` starts watching once the worker is registered. */
export const pwaUpdate = new PwaUpdate();
