// Zap-wait steps (web-only scenarios in watch-and-zap.feature). The fixture
// server bursts a 60 s channel from disk in well under a second, so the
// buffer gate's hold is invisible unless the pipe is slowed to the stream's
// own rate: every stream request waits for the document to finish loading
// (the app shell stays unthrottled, and a relaunch lifts the limit again at
// commit), then switches Chromium's network emulation (CDP, the only
// Chromium-specific call in the harness) to ~1.1× the fixture bitrate, so the
// runway builds at real-time like on a provider. Stream bytes travel over
// `fetch`, which never delays `load`, so the wait cannot deadlock. Assertions
// read the zap-wait layer:
// `held-frame` (the engine's canvas, data-held), `zap-wait`, `zap-wait-card`,
// `runway-progress` / `runway-label`.
import type { Page } from '@playwright/test';
import { Given, Then, expect } from './world';

/** news-one.ts is 234 kbit/s ≈ 29 KB/s; 32 KB/s fills a 12 s runway in ~11 s and keeps playing after. */
const REAL_TIME_BYTES_PER_SEC = 32_000;

async function throttleStreams(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  const limit = async (downloadThroughput: number): Promise<void> => {
    await cdp
      .send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 0,
        downloadThroughput,
        uploadThroughput: -1,
      })
      .catch(() => undefined);
  };
  // A new document (relaunch) loads its shell unthrottled; the next stream request re-arms the pipe.
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) void limit(-1);
  });
  await page.route('**/streams/**', async (route) => {
    await page.waitForLoadState('load');
    await limit(REAL_TIME_BYTES_PER_SEC);
    await route.continue();
  });
}

Given('the stream pipe delivers at real-time rate', async ({ world }) => throttleStreams(world.page));

/** Settings → Playback → Buffer size, as the picker would write it; read live by the next tune. */
Given('the buffer size is {string}', async ({ world }, size: string) => {
  await world.page.evaluate((value) => window.telly.setSetting('playback_buffer_size', value), size);
});

Then('the previous picture stays up while the runway builds', async ({ world }) => {
  const { page } = world;
  await expect(page.getByTestId('held-frame')).toHaveAttribute('data-held', 'true');
  await expect(page.getByTestId('held-frame')).toBeVisible();
  await expect(page.getByTestId('zap-wait')).toBeVisible();
  await expect(page.getByTestId('zap-wait-card')).toHaveCount(0);
});

Then('the channel card for {string} stands in for the picture', async ({ world }, name: string) => {
  const card = world.page.getByTestId('zap-wait-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText(name);
  await expect(card.getByAltText(`${name} logo`)).toBeAttached();
  await expect(world.page.getByTestId('held-frame')).toBeHidden();
});

Then('I see the runway progress towards {int} s', async ({ world }, need: number) => {
  const { page } = world;
  await expect(page.getByTestId('runway-label')).toHaveText(new RegExp(`^Buffering · \\d+ s of ${need} s$`));
  await expect(page.getByTestId('runway-progress').getByTestId('progress-bar')).toBeVisible();
  await expect(page.getByTestId('zap-wait').locator('[data-focus-id]')).toHaveCount(0);
});

Then('the zap wait is gone', async ({ world }) => {
  await expect(world.page.getByTestId('zap-wait')).toHaveCount(0);
  await expect(world.page.getByTestId('held-frame')).toBeHidden();
});
