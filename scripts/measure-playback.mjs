#!/usr/bin/env node
// Live-playback health probe — the one tool that caught both 2026-11-23 player
// bugs (latency chasing; the pre-roll-burst false start). Run it after ANY
// change under src/core/player, against the real provider, before and after:
//
//   node scripts/measure-playback.mjs [base] [proxyBase] [seconds] [playlist]
//   node scripts/measure-playback.mjs https://telly.jpc.io 'https://telly.jpc.io/proxy/?url=' 90
//   node scripts/measure-playback.mjs http://127.0.0.1:4175 'https://telly.jpc.io/proxy/?url=' 90
//
// It completes setup through the test hooks (`?e2e=1`), tunes the playlist's
// first channel and samples the <video> once a second: buffered runway ahead
// of the playhead, `waiting` events (rebuffers), seconds the playhead did not
// advance (stalled), dropped frames, plus the engine's state transitions with
// their timings (`telly-play state …` console lines). Measure twice — on a
// cold line (idle > 60 s: providers send a pre-roll burst) and immediately
// again on a warm one — and report both; they differ.
//
// Bar (2026-11-24, real provider through the nginx relay, 90 s, Small):
//   rebufferEvents 0 · stalledSeconds 0 · droppedFrames 0 · aheadMin ≥ 2 s.
import { chromium } from '@playwright/test';

const [
  base = 'https://telly.jpc.io',
  proxy = '',
  secsArg = '90',
  playlist = 'https://telly.jpc.io/jelly-sofa-sunset.m3u',
] = process.argv.slice(2);
const secs = Number(secsArg);
const ROOT = '[data-testid="app-root"]';

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
const states = [];
page.on('console', (m) => {
  const t = m.text();
  if (t.startsWith('telly-play state')) states.push(t.slice(17, 80));
});

// Fresh install: wipe storage, then complete setup against the playlist.
await page.goto(`${base}/?e2e=1`);
await page.waitForSelector(`${ROOT}:not([data-route="Boot"])`, { timeout: 20_000 });
await page.evaluate(async () => {
  localStorage.clear();
  const dbs = await indexedDB.databases();
  await Promise.all(
    dbs.map(
      (d) =>
        new Promise((r) => {
          const q = indexedDB.deleteDatabase(d.name);
          q.onsuccess = q.onerror = q.onblocked = () => r();
        }),
    ),
  );
});
await page.goto(`${base}/?e2e=1`);
await page.waitForSelector(ROOT);
await page.evaluate(
  ([pr]) => {
    window.telly.setSetting('general_cors_proxy_probed', 'true');
    window.telly.setSetting('general_cors_proxy', pr);
  },
  [proxy],
);
await page.evaluate((url) => window.telly.completeSetup(url), playlist);
await page.goto(`${base}/?e2e=1`);
await page.waitForSelector('[data-testid="video-surface"][data-state="Playing"]', { timeout: 40_000 });

await page.evaluate(() => {
  const v = document.querySelector('video');
  window.__m = { waiting: 0 };
  v.addEventListener('waiting', () => window.__m.waiting++);
});
const samples = [];
const t0 = Date.now();
while (Date.now() - t0 < secs * 1000) {
  await page.waitForTimeout(1000);
  samples.push(
    await page.evaluate(() => {
      const v = document.querySelector('video');
      const q = v.getVideoPlaybackQuality();
      const end = v.buffered.length ? v.buffered.end(v.buffered.length - 1) : 0;
      return {
        t: +v.currentTime.toFixed(2),
        ahead: +(end - v.currentTime).toFixed(2),
        dropped: q.droppedVideoFrames,
        total: q.totalVideoFrames,
        waiting: window.__m.waiting,
      };
    }),
  );
}
const stalled = samples.filter((s, i) => i > 0 && s.t - samples[i - 1].t < 0.5).length;
const last = samples[samples.length - 1];
const ahead = samples.map((s) => s.ahead);
console.log(
  JSON.stringify({
    base,
    proxy: proxy !== '',
    secs,
    rebufferEvents: last.waiting,
    stalledSeconds: stalled,
    droppedFrames: last.dropped,
    totalFrames: last.total,
    aheadMin: Math.min(...ahead),
    aheadMax: Math.max(...ahead),
    aheadAvg: +(ahead.reduce((a, b) => a + b, 0) / ahead.length).toFixed(2),
    playedSeconds: +(last.t - samples[0].t).toFixed(1),
  }),
);
console.log('ahead timeline:', ahead.join(' '));
console.log('states:', states.slice(0, 12).join(' | '));
await browser.close();
