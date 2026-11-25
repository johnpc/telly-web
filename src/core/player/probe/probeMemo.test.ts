import { afterEach, describe, expect, it, vi } from 'vitest';
import { PROBE_MEMO_TTL_MS, forgetProbes, recallProbe, rememberProbe } from './probeMemo';
import { probeUrl, sniffStream } from './urlProbe';

describe('probeMemo', () => {
  afterEach(() => forgetProbes());

  it('remembers a probe for the TTL only', () => {
    rememberProbe('u', { ok: true, contentType: 'video/mp4', contentLength: null }, 1000);
    expect(recallProbe('u', 1000 + PROBE_MEMO_TTL_MS)?.contentType).toBe('video/mp4');
    expect(recallProbe('u', 1001 + PROBE_MEMO_TTL_MS)).toBeNull();
    expect(recallProbe('other')).toBeNull();
  });

  it('a sniff leaves its headers behind so the live-or-file probe sends nothing', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(new Uint8Array(1504), { headers: { 'content-type': 'video/mp4' } });
    });
    await sniffStream('http://p/live', fetchImpl);
    const probe = await probeUrl('http://p/live', fetchImpl);
    expect(probe).toEqual({ ok: true, contentType: 'video/mp4', contentLength: null });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('the live-or-file probe remembers its own answer too', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { headers: { 'content-length': '7' } }));
    await probeUrl('http://p/1.ts', fetchImpl);
    await probeUrl('http://p/1.ts', fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
