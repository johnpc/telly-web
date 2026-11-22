// Shared acceptance harness. Every ACTION is a key press — the product
// promise is that a remote drives everything. Assertions read the DOM.
import { createBdd } from 'playwright-bdd';
import { test as base, expect, type Page } from '@playwright/test';

export const FIXTURE_HOST = 'http://127.0.0.1:8090';

export interface TellyWorld {
  page: Page;
  /** Loads the app with a clean profile (IndexedDB + localStorage wiped). */
  freshInstall(): Promise<void>;
  /** Same tab, cold start: equivalent to the Android "I relaunch telly". */
  relaunch(): Promise<void>;
  press(key: RemotePress, times?: number): Promise<void>;
  longPressOk(): Promise<void>;
  /** Focus the focusable node showing `text` (the way the Android harness's
   *  semantic RequestFocus does), then press OK. */
  select(text: string, within?: string): Promise<void>;
  focus(text: string, within?: string): Promise<void>;
  type(text: string): Promise<void>;
  seeText(text: string): Promise<void>;
  notSeeText(text: string): Promise<void>;
  seedSetup(playlistUrl?: string): Promise<void>;
}

export type RemotePress =
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Enter'
  | 'Escape'
  | 'PageUp'
  | 'PageDown'
  | 'ContextMenu'
  | 'MediaRewind'
  | 'MediaFastForward'
  | 'MediaPlayPause';

export const test = base.extend<{ world: TellyWorld }>({
  world: async ({ page }, use) => {
    const world: TellyWorld = {
      page,
      async freshInstall() {
        await page.goto('/?e2e=1');
        await page.evaluate(async () => {
          localStorage.clear();
          const dbs = await indexedDB.databases();
          await Promise.all(
            dbs.map(
              (d) =>
                new Promise<void>((r) => {
                  const q = indexedDB.deleteDatabase(d.name ?? '');
                  q.onsuccess = q.onerror = q.onblocked = () => r();
                }),
            ),
          );
        });
        await page.goto('/?e2e=1');
        await expect(page.getByTestId('app-root')).toBeVisible();
      },
      async relaunch() {
        await page.goto('/?e2e=1');
        await expect(page.getByTestId('app-root')).toBeVisible();
      },
      async press(key, times = 1) {
        for (let i = 0; i < times; i += 1) await page.keyboard.press(key);
      },
      async longPressOk() {
        await page.keyboard.down('Enter');
        await page.waitForTimeout(650);
        await page.keyboard.up('Enter');
      },
      async focus(text, within) {
        const scope = within ? page.getByTestId(within) : page;
        const node = scope.locator('[data-focus-id]').filter({ hasText: text }).first();
        await expect(node).toBeVisible();
        await node.evaluate((el) => (el as HTMLElement).focus());
        await expect(node).toBeFocused();
      },
      async select(text, within) {
        await world.focus(text, within);
        await page.keyboard.press('Enter');
      },
      async type(text) {
        await page.keyboard.type(text);
      },
      async seeText(text) {
        await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
      },
      async notSeeText(text) {
        await expect(page.getByText(text, { exact: false })).toHaveCount(0);
      },
      async seedSetup(playlistUrl = `${FIXTURE_HOST}/playlist.m3u`) {
        await page.evaluate(async (url) => {
          await window.telly.completeSetup(url);
        }, playlistUrl);
        await page.goto('/?e2e=1');
      },
    };
    await use(world);
  },
});

export const { Given, When, Then, Step, Before, After } = createBdd(test);
export { expect };

declare global {
  interface Window {
    telly: {
      completeSetup(playlistUrl: string, epgUrl?: string): Promise<void>;
      setSetting(key: string, value: string): void;
      now(): number;
    };
  }
}
