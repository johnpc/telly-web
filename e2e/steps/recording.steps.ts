// DVR recording steps (port of the Android RecordingSteps): opening the
// library from the quick-bar, recording the playing channel through the
// panel's context sheet, the custom-recording form, the transport record dot
// and library row actions (play / stop / delete). Every ACTION is a key
// press; focusing a node by text is the harness's RequestFocus equivalent.
// Assertions read the slice's data-testids: `recordings-screen`,
// `recording-row` (with `recording-channel` / `recording-detail` / `rec-badge`
// inside), `recording-player`, `custom-recording-form`, `transport-record`.
import type { Locator, Page } from '@playwright/test';
import { Then, When, expect } from './world';

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exact = (text: string): RegExp => new RegExp(`^${escapeRegExp(text)}$`);

const root = (page: Page): Locator => page.getByTestId('app-root');
const library = (page: Page): Locator => page.getByTestId('recordings-screen');
const panel = (page: Page): Locator => page.getByTestId('channel-panel');
const recordDot = (page: Page): Locator => page.getByTestId('transport-record');
const recordingRow = (page: Page, channel: string): Locator =>
  page
    .getByTestId('recording-row')
    .filter({ has: page.getByTestId('recording-channel').filter({ hasText: exact(channel) }) })
    .first();

/** Bare playback: the chrome is up with no overlay, no PIN card and no number entry. */
async function noChrome(page: Page): Promise<boolean> {
  const bare = page.getByTestId('playback-chrome').locator(':scope[data-overlay="None"]:not([data-prompt])');
  return (await bare.count()) === 1 && (await page.getByTestId('number-entry').count()) === 0;
}

/** BACK until nothing covers the video (a completed DVR action lands on the panel on purpose). */
async function dismissChrome(page: Page): Promise<void> {
  await expect(root(page)).toHaveAttribute('data-route', 'Playback');
  await expect
    .poll(async () => {
      if (await noChrome(page)) return true;
      await page.keyboard.press('Escape');
      return false;
    })
    .toBe(true);
}

async function focusNode(node: Locator): Promise<void> {
  await expect(node).toBeVisible();
  await node.evaluate((el) => (el as HTMLElement).focus());
  await expect(node).toBeFocused();
}

/** Opens the channel panel from bare playback (OK shows the info overlay, DOWN expands it). */
async function openPanel(page: Page): Promise<void> {
  if (await panel(page).isVisible()) return;
  await dismissChrome(page);
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await expect(panel(page)).toBeVisible();
}

/** Long-OK on the tuned channel's panel row, then OK the sheet row `item`. */
async function sheetRowForPlaying(page: Page, longPressOk: () => Promise<void>, item: string): Promise<void> {
  const name = await page.getByTestId('playback-screen').getAttribute('data-channel-name');
  if (name === null) throw new Error('nothing is tuned');
  await openPanel(page);
  const row = page
    .locator('[data-testid^="panel-row-"]')
    .filter({ has: page.getByTestId('row-name').filter({ hasText: exact(name) }) })
    .first();
  await focusNode(row);
  await longPressOk();
  const sheet = page.getByTestId('channel-menu');
  await expect(sheet).toBeVisible();
  await focusNode(
    sheet
      .locator('[data-focus-id]')
      .filter({ hasText: exact(item) })
      .first(),
  );
  await page.keyboard.press('Enter');
}

/** A completed dot action clears the chrome; UP UP re-opens the transport row. */
async function ensureTransportVisible(page: Page): Promise<void> {
  await expect
    .poll(async () => {
      if (await recordDot(page).isVisible()) return true;
      await page.keyboard.press('ArrowUp');
      return false;
    })
    .toBe(true);
}

// The quick-bar's Recordings slot: back out of any chrome first (long-OK on the
// panel would open a row sheet instead), long-OK opens the bar, OK the slot.
When('I open the recordings library', async ({ world }) => {
  const { page } = world;
  if (await library(page).isVisible()) return;
  await dismissChrome(page);
  const slot = page.locator('[data-focus-id="quickbar-Recordings"]');
  await expect
    .poll(async () => {
      if (await slot.isVisible()) return true;
      if (await noChrome(page)) await world.longPressOk();
      return false;
    })
    .toBe(true);
  await focusNode(slot);
  await page.keyboard.press('Enter');
  await expect(library(page)).toBeVisible();
});

When('I record the playing channel from the context sheet', async ({ world }) => {
  await sheetRowForPlaying(world.page, () => world.longPressOk(), 'Record');
  await expect(world.page.getByTestId('channel-menu')).toHaveCount(0);
});

When('I open the custom recording form for the playing channel', async ({ world }) => {
  await sheetRowForPlaying(world.page, () => world.longPressOk(), 'Custom recording');
  await expect(world.page.getByTestId('custom-recording-form')).toBeVisible();
});

/** Bare playback -> info overlay -> transport row (second UP). */
When('I open the playback transport row', async ({ world }) => {
  await dismissChrome(world.page);
  await ensureTransportVisible(world.page);
});

When('I activate the transport record dot', async ({ world }) => {
  await ensureTransportVisible(world.page);
  await focusNode(recordDot(world.page));
  await world.page.keyboard.press('Enter');
});

/**
 * The dot's accessible name, re-opening the transport row whenever the
 * completed action (or the auto-hide) took it away in the meantime — the
 * instant record lands asynchronously and dismisses the chrome.
 */
async function expectDotLabel(page: Page, label: string): Promise<void> {
  await expect
    .poll(async () => {
      await ensureTransportVisible(page);
      return recordDot(page).getAttribute('aria-label');
    })
    .toBe(label);
}

Then('the transport record dot shows the channel recording', async ({ world }) =>
  expectDotLabel(world.page, 'Recording'),
);

Then('the transport record dot is idle again', async ({ world }) => expectDotLabel(world.page, 'Record'));

Then('the recordings library is empty', async ({ world }) => {
  await expect(library(world.page)).toBeVisible();
  await expect(world.page.getByText('No recordings', { exact: true })).toBeVisible();
});

Then('the recordings library shows a recording of {string}', async ({ world }, channel: string) => {
  await expect(recordingRow(world.page, channel)).toBeVisible();
});

Then('the recording shows the REC badge', async ({ world }) => {
  await expect(world.page.getByTestId('rec-badge').first()).toBeVisible();
});

Then('the recording shows the {string} state', async ({ world }, state: string) => {
  await expect(
    world.page
      .getByTestId('recording-detail')
      .filter({ hasText: exact(state) })
      .first(),
  ).toBeVisible();
});

When('I select the recording of {string}', async ({ world }, channel: string) => {
  await focusNode(recordingRow(world.page, channel));
  await world.page.keyboard.press('Enter');
});

When('I long-press ok on the recording of {string}', async ({ world }, channel: string) => {
  await focusNode(recordingRow(world.page, channel));
  await world.longPressOk();
});

Then('the recording plays back fullscreen', async ({ world }) => {
  await expect(world.page.getByTestId('recording-player')).toBeVisible();
});

/**
 * DVR-store assertion (no library UI involved) so the guide/panel sheet
 * scenarios stay independent of recording.feature's flows: reads the
 * `recordings` table straight out of IndexedDB.
 */
Then('a recording of {string} is in progress', async ({ world }, channel: string) => {
  await expect
    .poll(() =>
      world.page.evaluate(
        (name) =>
          new Promise<boolean>((resolve) => {
            const open = indexedDB.open('telly');
            open.onerror = () => resolve(false);
            open.onsuccess = () => {
              const db = open.result;
              const request = db.transaction('recordings').objectStore('recordings').getAll();
              request.onerror = () => resolve(false);
              request.onsuccess = () => {
                const rows = request.result as { channelName: string; status: string }[];
                db.close();
                resolve(rows.some((row) => row.channelName === name && row.status === 'RECORDING'));
              };
            };
          }),
        channel,
      ),
    )
    .toBe(true);
});
