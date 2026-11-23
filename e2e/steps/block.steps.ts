// Steps for PIN-gated channel blocking (block-channel.feature) that belong to
// the playback slice: arranging the parental PIN / a blocked channel through
// the app's own stores, and the channel context sheet's rows. PIN entry and
// the panel rows are shared steps owned by the settings and panel slices.
import type { Page } from '@playwright/test';
import { Given, Then, expect } from './world';

/** Stores a salted SHA-256 PIN exactly like `ParentalControls.setPin` (the master toggle stays as it is). */
async function storePin(page: Page, pin: string): Promise<void> {
  await page.evaluate(async (raw) => {
    const hex = (bytes: Uint8Array): string =>
      [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${raw}`));
    window.telly.setSetting('parental_pin_salt', salt);
    window.telly.setSetting('parental_pin_hash', hex(new Uint8Array(digest)));
  }, pin);
}

Given('the parental PIN is {string}', async ({ world }, pin: string) => storePin(world.page, pin));

// Arranged through the app's own data layer (the `channels.blocked` flag); the running
// app's live queries pick it up, exactly as the Android step's Room write does — no relaunch.
Given(
  'the channel {string} is blocked behind the PIN {string}',
  async ({ world }, name: string, pin: string) => {
    await storePin(world.page, pin);
    await world.page.evaluate((channelName) => window.telly.setBlocked(channelName, true), name);
  },
);

Then('I see the menu row {string}', async ({ world }, label: string) => {
  await expect(
    world.page.getByTestId('channel-menu').getByTestId('menu-row').filter({ hasText: label }),
  ).toBeVisible();
});

Then('I see the menu rows {string} and {string}', async ({ world }, first: string, second: string) => {
  const rows = world.page.getByTestId('channel-menu').getByTestId('menu-row');
  await expect(rows.filter({ hasText: first })).toBeVisible();
  await expect(rows.filter({ hasText: second })).toBeVisible();
});
