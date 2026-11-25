// The engine probes an extensionless URL twice per tune — a sniffing GET to
// pick the transport, then a HEAD to tell file from live pipe. The sniff
// already saw the headers, so it leaves them here and the HEAD is skipped: one
// fewer round trip (through a TLS proxy that is ~1 s off the first frame).
import type { UrlProbe } from './urlProbe';

export const PROBE_MEMO_TTL_MS = 30_000;

interface Entry {
  probe: UrlProbe;
  at: number;
}

const memo = new Map<string, Entry>();

export function rememberProbe(url: string, probe: UrlProbe, now = Date.now()): void {
  memo.set(url, { probe, at: now });
}

export function recallProbe(url: string, now = Date.now()): UrlProbe | null {
  const entry = memo.get(url);
  if (entry === undefined) return null;
  if (now - entry.at > PROBE_MEMO_TTL_MS) {
    memo.delete(url);
    return null;
  }
  return entry.probe;
}

export function forgetProbes(): void {
  memo.clear();
}
