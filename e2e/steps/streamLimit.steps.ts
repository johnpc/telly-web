// A provider whose line carries ONE stream (director item 5). Measured
// 2026-11-24 on the real provider through the relay: with two or three
// concurrent connections only one receives data; every other gets HTTP 200
// with an identical ~710 KB body — a "too many connections" slate — that then
// ends. The fixture server bursts finite files WITH a Content-Length, and
// `route.fulfill` always adds one, while the engine reads a length as "finite
// file, not a live pipe"; so neither the line nor the slate can be modelled by
// fulfilling routes. Instead the Given step below routes the five channel
// clips to a tiny provider on 127.0.0.1:8091 that answers chunked, without a
// length, like a live pipe: the FIRST clip a scenario asks for holds the line
// and streams whole; every other clip gets the slate — the first SLATE_BYTES
// of that clip, ≈5 s at the fixture's 29 KB/s (the real slate is ≈0.8 s of a
// 0.9 MB/s stream; what matters is that it ends well inside the engine's 20 s
// window). The line is keyed by URL rather than by socket, so the fullscreen →
// multiview hand-over (two connections to the SAME url overlapping the 400 ms
// release grace) is not modelled, and "a recording started while watching" is
// exercised by recording a different channel than the one on screen.
import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { join } from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { Given, Then, expect, type TellyWorld } from './world';

const PROVIDER_PORT = 8091;
const PROVIDER = `http://127.0.0.1:${PROVIDER_PORT}`;
const CLIPS = ['news-one', 'sports-arena', 'movie-house', 'kids-zone', 'music-box'] as const;
const CLIP_URL = new RegExp(`/streams/(${CLIPS.join('|')})\\.ts(\\?|$)`);
/** 188-byte packets × 800 ≈ 150 KB ≈ 5 s of the fixture clip; the slate must end inside the 20 s window. */
const SLATE_BYTES = 188 * 800;

/** What one scenario's provider has seen: who holds the line, and every stream request in order. */
interface Line {
  holder: string | null;
  requests: string[];
}

const lines = new WeakMap<Page, Line>();
const clips = new Map<string, Buffer>();
let provider: Promise<Server> | null = null;

function clipBytes(name: string): Buffer {
  const cached = clips.get(name);
  if (cached !== undefined) return cached;
  const bytes = readFileSync(join(process.cwd(), 'e2e', 'fixtures', 'site', 'streams', `${name}.ts`));
  clips.set(name, bytes);
  return bytes;
}

/** `/real/<clip>.ts` streams the clip whole, `/slate/<clip>.ts` its first SLATE_BYTES; both chunked, no length. */
function serve(req: IncomingMessage, res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', '*');
  if (req.method === 'OPTIONS') return void res.writeHead(204).end();
  const match = /^\/(real|slate)\/([a-z-]+)\.ts/.exec(req.url ?? '');
  if (match === null) return void res.writeHead(404).end();
  const [, kind, name] = match;
  const clip = clipBytes(name ?? '');
  res.writeHead(200, { 'Content-Type': 'video/mp2t', 'Cache-Control': 'no-store' });
  res.write(kind === 'slate' ? clip.subarray(0, SLATE_BYTES) : clip);
  res.end();
}

function startProvider(): Promise<Server> {
  provider ??= new Promise((resolve, reject) => {
    const server = createServer(serve);
    server.unref();
    server.once('error', reject);
    server.listen(PROVIDER_PORT, '127.0.0.1', () => resolve(server));
  });
  return provider;
}

function lineOf(page: Page): Line {
  const line = lines.get(page);
  if (line === undefined) throw new Error('this scenario has no one-stream provider (missing Given)');
  return line;
}

const paneNamed = (page: Page, name: string): Locator =>
  page.locator(`[data-testid="multiview-pane"][data-channel-name="${name}"]`);

/**
 * Routes the channel clips through the one-stream provider, then cold-starts the
 * app so its first tune (and the probe memo behind it) already runs on that line.
 */
Given('the provider allows one stream at a time', async ({ world }) => {
  await startProvider();
  const line: Line = { holder: null, requests: [] };
  lines.set(world.page, line);
  await world.page.route(CLIP_URL, async (route) => {
    const name = CLIP_URL.exec(route.request().url())?.[1] ?? '';
    line.holder ??= name;
    line.requests.push(name);
    const kind = name === line.holder ? 'real' : 'slate';
    await route.continue({ url: `${PROVIDER}/${kind}/${name}.ts` });
  });
  await world.relaunch();
});

Then('the multiview pane {string} says {string}', async ({ world }, name: string, text: string) => {
  await expect(paneNamed(world.page, name).getByTestId('multiview-pane-limit')).toHaveText(text);
});

/** The pane's engine state as the `<video>` host reports it (Error is terminal: no Reconnecting ever follows). */
Then(
  'the multiview pane {string} is in the {string} state',
  async ({ world }, name: string, state: string) => {
    await expect(paneNamed(world.page, name).getByTestId('video-surface-host')).toHaveAttribute(
      'data-state',
      state,
    );
  },
);

Then('the multiview pane {string} is still streaming', async ({ world }, name: string) => {
  await expect(paneNamed(world.page, name).getByTestId('video-surface-host')).toHaveAttribute(
    'data-state',
    /^(Buffering|Playing)$/,
  );
});

/** Counts the provider's requests for `clip` AFTER a UI round trip (OK opens the pane menu, BACK closes it) has given any late request time to land. */
async function requestsAfterRoundTrip(world: TellyWorld, clip: string): Promise<number> {
  const { page } = world;
  await world.press('Enter');
  await expect(page.getByTestId('multiview-menu')).toBeVisible();
  await world.press('Escape');
  await expect(page.getByTestId('multiview-menu')).toHaveCount(0);
  return lineOf(page).requests.filter((name) => name === clip).length;
}

Then('the provider was never asked for the stream {string}', async ({ world }, clip: string) => {
  expect(await requestsAfterRoundTrip(world, clip)).toBe(0);
});

Then('the provider is not asked again for the stream {string}', async ({ world }, clip: string) => {
  const before = lineOf(world.page).requests.filter((name) => name === clip).length;
  expect(before).toBeGreaterThan(0);
  expect(await requestsAfterRoundTrip(world, clip)).toBe(before);
});
