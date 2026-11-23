// Steps for the VOD slice: classification out of the guide, the rail's
// Movies icon -> browser, seekable playback and the Resume prompt. Reads
// `vod-card`, `vod-card-progress`, `vod-transport`, `video-surface`.
import type { Locator, Page } from '@playwright/test';
import { Then, When, expect } from './world';

const vodCard = (page: Page, name: string): Locator =>
  page.getByTestId('vod-card').filter({ has: page.getByTestId('vod-card-name').filter({ hasText: name }) });

async function focusNode(node: Locator): Promise<void> {
  await expect(node).toBeVisible();
  await node.evaluate((el) => (el as HTMLElement).focus());
  await expect(node).toBeFocused();
}

/** Rows in a Dexie table, read through the raw IndexedDB API the app itself writes to. */
async function tableCount(page: Page, table: string): Promise<number> {
  return page.evaluate(
    (name) =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open('telly');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const count = db.transaction(name, 'readonly').objectStore(name).count();
          count.onsuccess = () => {
            db.close();
            resolve(count.result);
          };
          count.onerror = () => reject(count.error);
        };
      }),
    table,
  );
}

Then(
  'the playlist imported {int} live channels and {int} VOD items',
  async ({ world }, channels: number, vodItems: number) => {
    const { page } = world;
    await expect.poll(() => tableCount(page, 'channels')).toBe(channels);
    await expect.poll(() => tableCount(page, 'vod_items')).toBe(vodItems);
  },
);

/** BACK to the guide root (playback overlays consume the first BACKs), then BACK on the bare grid opens the groups column + rail. */
async function openGuideGroups(page: Page): Promise<void> {
  const root = page.getByTestId('app-root');
  await expect
    .poll(async () => {
      if ((await root.getAttribute('data-route')) === 'Guide') return true;
      await page.keyboard.press('Escape');
      return false;
    })
    .toBe(true);
  await expect(page.getByTestId('guide-loading')).toHaveCount(0);
  if (!(await page.getByTestId('guide-groups').isVisible())) await page.keyboard.press('Escape');
  await expect(page.getByTestId('guide-groups')).toBeVisible();
}

When("I open the guide's groups column", async ({ world }) => openGuideGroups(world.page));

When('I open the VOD browser from the guide rail', async ({ world }) => {
  const { page } = world;
  await openGuideGroups(page);
  await focusNode(page.locator('[data-focus-id="guide-rail-movies"]'));
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('vod-card').first()).toBeVisible();
});

Then('I see the VOD item card {string}', async ({ world }, name: string) => {
  await expect(vodCard(world.page, name)).toBeVisible();
});

When('I play the VOD item {string}', async ({ world }, name: string) => {
  await focusNode(vodCard(world.page, name));
  await world.page.keyboard.press('Enter');
});

Then('VOD playback starts with the transport visible', async ({ world }) => {
  const { page } = world;
  await expect(page.getByTestId('vod-playback').locator('[data-testid="video-surface"]')).toHaveAttribute(
    'data-state',
    'Playing',
  );
  await expect(page.getByTestId('vod-transport')).toBeVisible();
});

Then('the transport shows the title {string}', async ({ world }, title: string) => {
  await expect(world.page.getByTestId('vod-transport').getByTestId('vod-transport-title')).toHaveText(title);
});

Then('the VOD item card {string} shows watch progress', async ({ world }, name: string) => {
  await expect(vodCard(world.page, name).getByTestId('vod-card-progress')).toBeVisible();
});
