import { describe, expect, it, vi } from 'vitest';
import {
  LIVE_SHELL_QUERY,
  assetRefs,
  liveShellVersion,
  shellVersion,
  workerUrl,
  workerVersion,
} from './shellVersion';

const SHELL_HTML = `<!doctype html><html><head>
  <link rel="icon" href="/icon.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <script type="module" crossorigin src="/assets/index-C3xk9Q2b.js"></script>
  <link rel="stylesheet" crossorigin href="/assets/index-Dq1Zp0aa.css">
  <script src="https://cdn.example/other.js"></script>
</head><body><div id="root"></div></body></html>`;

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('assetRefs', () => {
  it('lists only the document’s own hashed assets, sorted', () => {
    expect(assetRefs(parse(SHELL_HTML), '/')).toEqual([
      '/assets/index-C3xk9Q2b.js',
      '/assets/index-Dq1Zp0aa.css',
    ]);
  });

  it('honours the deploy base (GitHub Pages serves from /telly-web/)', () => {
    const html = SHELL_HTML.replaceAll('/assets/', '/telly-web/assets/');
    expect(assetRefs(parse(html), '/telly-web/')).toHaveLength(2);
    expect(assetRefs(parse(html), '/')).toEqual([]);
  });
});

describe('shellVersion', () => {
  it('is eight hex characters, stable for the same assets, different for any changed hash', () => {
    const a = shellVersion(parse(SHELL_HTML), '/');
    expect(a).toMatch(/^[0-9a-f]{8}$/);
    expect(shellVersion(parse(SHELL_HTML), '/')).toBe(a);
    const css = shellVersion(parse(SHELL_HTML.replace('Dq1Zp0aa', 'Dq1Zp0ab')), '/');
    const js = shellVersion(parse(SHELL_HTML.replace('C3xk9Q2b', 'C3xk9Q2c')), '/');
    expect(new Set([a, css, js]).size).toBe(3);
  });

  it('ignores markup that is not an asset reference (React output, logos, the manifest)', () => {
    const noisy = SHELL_HTML.replace('<div id="root"></div>', '<div id="root"><img src="/logo.png"></div>');
    expect(shellVersion(parse(noisy), '/')).toBe(shellVersion(parse(SHELL_HTML), '/'));
  });
});

describe('workerUrl / workerVersion', () => {
  it('round-trips the version through the registration URL', () => {
    expect(workerUrl('/', 'abcd1234')).toBe('/sw.js?v=abcd1234');
    expect(workerVersion('https://telly.jpc.io/sw.js?v=abcd1234')).toBe('abcd1234');
    expect(workerVersion(workerUrl('/telly-web/', 'ffff0000'))).toBe('ffff0000');
  });

  it('reads null off a worker registered before versions existed', () => {
    expect(workerVersion('https://telly.jpc.io/sw.js')).toBeNull();
  });
});

describe('liveShellVersion', () => {
  it('fetches the start document past both caches and versions it like the live DOM', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(SHELL_HTML, { status: 200 }));
    await expect(liveShellVersion('/telly-web/', fetchFn)).resolves.toBe(
      shellVersion(parse(SHELL_HTML), '/telly-web/'),
    );
    expect(fetchFn).toHaveBeenCalledWith(`/telly-web/${LIVE_SHELL_QUERY}`, { cache: 'no-store' });
  });

  it('is null when the host answers an error or the network is gone', async () => {
    const failing = vi.fn<typeof fetch>().mockResolvedValue(new Response('nope', { status: 503 }));
    await expect(liveShellVersion('/', failing)).resolves.toBeNull();
    const offline = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(liveShellVersion('/', offline)).resolves.toBeNull();
  });
});
