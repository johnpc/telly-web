// Fullscreen playback steps (port of the Android PlaybackSteps). Every ACTION
// is a key press. Assertions read the playback slice's data-testids:
// `playback-screen` (data-channel-number / data-channel-name), `video-surface`
// (data-state), `playback-chrome` (data-overlay / data-prompt), `info-overlay`,
// `info-channel`, `info-title`, `info-range`, `info-next`, `info-badges`,
// `cards-row`, `quick-bar` / `quick-bar-label`, `zap-overlay`, `number-entry`.
import type { Locator, Page } from '@playwright/test';
import { Given, Then, When, expect } from './world';

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const channelLabel = (number: number, name: string): RegExp =>
  new RegExp(`^${number}\\s+${escapeRegExp(name)}$`);

const screen = (page: Page): Locator => page.getByTestId('playback-screen');
const chrome = (page: Page): Locator => page.getByTestId('playback-chrome');
const infoOverlay = (page: Page): Locator => page.getByTestId('info-overlay');
const quickBar = (page: Page): Locator => page.getByTestId('quick-bar');

/** Bare playback: the chrome is up with no overlay, no PIN card and no number entry. */
async function noChrome(page: Page): Promise<boolean> {
  const bare = chrome(page).locator(':scope[data-overlay="None"]:not([data-prompt])');
  return (await bare.count()) === 1 && (await page.getByTestId('number-entry').count()) === 0;
}

async function expectTuned(page: Page, number: number, name: string): Promise<void> {
  await expect(page.getByTestId('app-root')).toHaveAttribute('data-route', 'Playback');
  await expect(screen(page)).toHaveAttribute('data-channel-number', String(number));
  await expect(screen(page)).toHaveAttribute('data-channel-name', name);
}

/** Proves fullscreen playback of `number`/`name`: tuned, pictures flowing, nothing over the video. */
async function expectPlaybackOn(page: Page, number: number, name: string): Promise<void> {
  await expectTuned(page, number, name);
  await expect(page.getByTestId('video-surface')).toHaveAttribute('data-state', 'Playing', {
    timeout: 30_000,
  });
}

/** Opens the info overlay when the screen is bare (idempotent while it is already up). */
async function ensureInfoOverlay(page: Page): Promise<void> {
  await expect
    .poll(async () => {
      if (await infoOverlay(page).isVisible()) return true;
      if (await noChrome(page)) await page.keyboard.press('Enter');
      return false;
    })
    .toBe(true);
}

export async function ensureQuickBar(page: Page, longPressOk: () => Promise<void>): Promise<void> {
  await expect
    .poll(async () => {
      if (await quickBar(page).isVisible()) return true;
      if (await noChrome(page)) await longPressOk();
      return false;
    })
    .toBe(true);
}

// 'playback starts fullscreen on channel {int} {string}' is owned by onboarding.steps.ts (its weaker
// route-only check); the full proof (tuned attributes + video Playing) is `expectPlaybackOn` below.
Then('playback goes fullscreen on channel {int} {string}', async ({ world }, number: number, name: string) =>
  expectPlaybackOn(world.page, number, name),
);

Then('no chrome is visible over the video', async ({ world }) => {
  await expect.poll(() => noChrome(world.page)).toBe(true);
});

// A DIRECT tune by channel number (ux-spec §3.3), not CH+ hops: every hop is a
// real tune the watch history records, which would pollute the History
// scenarios with the channels stepped over on the way.
Given('I zapped to channel {int} {string}', async ({ world }, number: number, name: string) => {
  const { page } = world;
  await expect(screen(page)).toHaveAttribute('data-channel-number', /\d+/);
  for (const digit of String(number)) await page.keyboard.press(digit);
  await expect(page.getByTestId('number-entry')).toHaveText(String(number));
  await page.keyboard.press('Enter');
  await expectTuned(page, number, name);
  await expect(page.getByTestId('zap-overlay').getByTestId('info-channel')).toHaveText(
    channelLabel(number, name),
  );
});

Then('playback switches to channel {int} {string}', async ({ world }, number: number, name: string) => {
  await expectTuned(world.page, number, name);
  await expect(world.page.getByTestId('info-channel')).toHaveText(channelLabel(number, name));
});

// Like the Android harness, the step re-opens the overlay when the preceding OK
// landed before the screen took keys (it is idempotent while the overlay is up).
Then('I see the bottom info overlay', async ({ world }) => ensureInfoOverlay(world.page));

Then(
  'I see the channel logo, number {int} and name {string}',
  async ({ world }, number: number, name: string) => {
    const overlay = infoOverlay(world.page);
    await expect(overlay.getByTestId('info-channel')).toHaveText(channelLabel(number, name));
    await expect(overlay.getByAltText(`${name} logo`)).toBeAttached();
  },
);

Then('I see the current programme title with its time range and progress', async ({ world }) => {
  const overlay = infoOverlay(world.page);
  await expect(overlay.getByTestId('info-title')).not.toHaveText(/^(No information)?$/);
  await expect(overlay.getByTestId('info-range')).toHaveText(/\d{2}:\d{2}( [AP]M)? — \d{2}:\d{2}( [AP]M)?/);
  await expect(overlay.getByTestId('progress-bar').first()).toBeVisible();
});

Then('I see the next programme line', async ({ world }) => {
  await expect(infoOverlay(world.page).getByTestId('info-next')).toHaveText(/\d{2}:\d{2}.+\S/);
});

Then(
  'I see stream badges like {string}, {string} and {string}',
  async ({ world }, a: string, b: string, c: string) => {
    // Badges appear once the decoder reports the stream format; the overlay
    // auto-hides, so it is re-opened until they are rendered.
    const { page } = world;
    await expect
      .poll(
        async () => {
          await ensureInfoOverlay(page);
          return infoOverlay(page).getByTestId('info-badges').innerText();
        },
        { timeout: 60_000 },
      )
      .toMatch(new RegExp([a, b, c].map(escapeRegExp).join('\\s*')));
  },
);

Then('I see the {string} and {string} cards', async ({ world }, first: string, second: string) => {
  const cards = world.page.getByTestId('cards-row');
  await expect(cards.getByText(first, { exact: true })).toBeVisible();
  await expect(cards.getByText(second, { exact: true })).toBeVisible();
});

When('I select the {string} card', async ({ world }, label: string) => {
  await ensureInfoOverlay(world.page);
  await world.select(label, 'cards-row');
});

async function expectQuickBarLabels(
  page: Page,
  longPressOk: () => Promise<void>,
  labels: string[],
): Promise<void> {
  // The resolution/audio slots read from the real decoder; the bar auto-hides,
  // so it is re-opened until the labels settle.
  await expect
    .poll(
      async () => {
        await ensureQuickBar(page, longPressOk);
        return quickBar(page).getByTestId('quick-bar-label').allInnerTexts();
      },
      { timeout: 60_000 },
    )
    .toEqual(expect.arrayContaining(labels));
}

Then(
  'I see the quick-bar slots {string}, {string}, {string}, {string} and {string}',
  async ({ world }, a: string, b: string, c: string, d: string, e: string) =>
    expectQuickBarLabels(world.page, () => world.longPressOk(), [a, b, c, d, e]),
);

Then(
  'I see the live stream slots {string}, {string}, {string} and {string}',
  async ({ world }, a: string, b: string, c: string, d: string) =>
    expectQuickBarLabels(world.page, () => world.longPressOk(), [a, b, c, d]),
);

Then('the channel list panel opens over the dimmed video', async ({ world }) => {
  await expect(world.page.getByTestId('channel-panel')).toBeVisible();
});
