import { defaultSettingsRepository } from '@/core/settings/settingsContext';
import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';

/**
 * Zero-config proxy on hosts that ship one: the self-hosted image answers
 * `<origin><BASE_URL>proxy/healthz` with `ok` (GitHub Pages and the e2e
 * fixture harness do not). Runs ONCE per install at app start, fire-and-
 * forget so the start route never waits: a configured "Stream & CORS proxy"
 * is `Found` without a probe; an unset one is probed and, on `ok`, filled in
 * with `<origin><BASE_URL>proxy/?url=`. The `general_cors_proxy_probed`
 * marker is written whatever the outcome, so a value the user set or cleared
 * deliberately is never touched again (web-only machine).
 */
// @stateMachine('Proxy discovery')
export type ProxyDiscoveryState =
  { kind: 'Unknown' } | { kind: 'Probing' } | { kind: 'Found'; base: string } | { kind: 'Absent' };

export interface ProxyEndpoints {
  healthz: string;
  base: string;
}

export type HealthFetch = (input: string, init: RequestInit) => Promise<Response>;

export interface ProxyDiscoveryDeps {
  settings: SettingsRepository;
  endpoints: ProxyEndpoints;
  fetchImpl?: HealthFetch;
}

export const HEALTHZ_TIMEOUT_MS = 3_000;

/** `<origin><baseUrl>proxy/…` with duplicate slashes collapsed (`BASE_URL` is `/` or `/telly-web/`). */
export function proxyEndpoints(origin: string, baseUrl: string): ProxyEndpoints {
  const root = `${origin}/${baseUrl}/proxy/`.replace(/(?<!:)\/{2,}/g, '/');
  return { healthz: `${root}healthz`, base: `${root}?url=` };
}

async function healthy(fetchImpl: HealthFetch, url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTHZ_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    return response.ok && (await response.text()).trim() === 'ok';
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export class ProxyDiscovery {
  private current: ProxyDiscoveryState = { kind: 'Unknown' };

  constructor(private readonly deps: ProxyDiscoveryDeps) {}

  get state(): ProxyDiscoveryState {
    return this.current;
  }

  /** Runs at most once per instance; resolves with the settled state. */
  async run(): Promise<ProxyDiscoveryState> {
    if (this.current.kind !== 'Unknown') return this.current;
    const decided = this.withoutProbe();
    if (decided !== null) return this.settle(decided);
    this.current = { kind: 'Probing' };
    return this.settle(await this.probe());
  }

  /** A configured value is Found as is; an earlier probe (or a deliberate clear) means Absent. Null = probe. */
  private withoutProbe(): ProxyDiscoveryState | null {
    const configured = this.deps.settings.get(TellySettings.CORS_PROXY).trim();
    if (configured !== '') return { kind: 'Found', base: configured };
    return this.deps.settings.get(TellySettings.CORS_PROXY_PROBED) ? { kind: 'Absent' } : null;
  }

  private async probe(): Promise<ProxyDiscoveryState> {
    const { endpoints, fetchImpl = (input, init): Promise<Response> => fetch(input, init) } = this.deps;
    if (!(await healthy(fetchImpl, endpoints.healthz))) return { kind: 'Absent' };
    this.deps.settings.set(TellySettings.CORS_PROXY, endpoints.base);
    return { kind: 'Found', base: endpoints.base };
  }

  private settle(state: ProxyDiscoveryState): ProxyDiscoveryState {
    this.deps.settings.set(TellySettings.CORS_PROXY_PROBED, true);
    this.current = state;
    return state;
  }
}

export function createProxyDiscovery(
  settings: SettingsRepository = defaultSettingsRepository,
): ProxyDiscovery {
  return new ProxyDiscovery({
    settings,
    endpoints: proxyEndpoints(window.location.origin, import.meta.env.BASE_URL),
  });
}

/** The app's one discovery; `App` kicks `run()` off at first render. */
export const proxyDiscovery: ProxyDiscovery = createProxyDiscovery();
