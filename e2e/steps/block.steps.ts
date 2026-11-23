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

// Arranged in the app's own database (the `channels.blocked` flag), then a
// relaunch so every live query starts from the blocked state — the Android
// step writes the Room row the same way before the scenario proceeds.
Given(
  'the channel {string} is blocked behind the PIN {string}',
  async ({ world }, name: string, pin: string) => {
    const { page } = world;
    await storePin(page, pin);
    await page.evaluate(
      (channelName) =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('telly');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            const tx = db.transaction('channels', 'readwrite');
            const store = tx.objectStore('channels');
            const all = store.getAll();
            all.onsuccess = () => {
              const rows = all.result as { name: string; blocked: boolean }[];
              const row = rows.find((r) => r.name === channelName);
              if (row === undefined) return reject(new Error(`no channel named ${channelName}`));
              store.put({ ...row, blocked: true });
            };
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error);
          };
        }),
      name,
    );
    await world.relaunch();
    // Playback is up when a channel is tuned OR, when the blocked channel was the last-watched
    // one, when its PIN prompt gates the restore tune (Android's gate fires first, too).
    await expect(
      page
        .getByTestId('playback-screen')
        .and(page.locator('[data-channel-number]'))
        .or(page.getByTestId('pin-prompt')),
    ).toBeVisible();
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
