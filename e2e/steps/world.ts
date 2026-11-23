// Shared acceptance harness. Every ACTION is a key press — the product
// promise is that a remote drives everything. Assertions read the DOM.
import { createBdd, test as base } from 'playwright-bdd';
import { expect, type Page } from '@playwright/test';

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
  | 'MediaTrackPrevious'
  | 'MediaTrackNext'
  | 'MediaPlayPause';

/** The start route has resolved: keys pressed before this would hit the bare Boot frame. */
async function settled(page: Page): Promise<void> {
  const root = page.getByTestId('app-root');
  await expect(root).toBeVisible();
  await expect(root).not.toHaveAttribute('data-route', 'Boot');
}

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
        await settled(page);
      },
      async relaunch() {
        await page.goto('/?e2e=1');
        await settled(page);
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
        // Visible text or, for icon-only controls (rail icons, trash cans), the aria-label.
        // Exact matches win (Android `hasText` is exact): `data-channel-name`, then whole-text,
        // then aria-label for icon-only controls; substring text is the last resort ("1:00" vs "-11:00").
        const focusables = scope.locator('[data-focus-id]');
        const exact = new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
        const fallback = focusables.filter({ hasText: text });
        const preferred = [
          scope.locator(`[data-focus-id][data-channel-name="${text}"]`),
          focusables.filter({ hasText: exact }),
          scope.locator(`[data-focus-id][aria-label="${text}"]`),
        ];
        let node = fallback;
        for (const candidate of preferred) {
          if ((await candidate.count()) > 0) {
            node = candidate;
            break;
          }
        }
        node = node.first();
        await expect(node).toBeVisible();
        await node.evaluate((el) => (el as HTMLElement).focus());
        await expect(node).toBeFocused();
      },
      async select(text, within) {
        await world.focus(text, within);
        await page.keyboard.press('Enter');
      },
      async type(text) {
        // Android `performTextReplacement` + IME action: value dialogs commit here; the search
        // query bar (which owns a voice orb) commits only on the explicit IME-search step.
        await page.keyboard.type(text);
        const searchBar = await page.getByTestId('search-query').count();
        if (searchBar === 0) await page.keyboard.press('Enter');
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
        await settled(page);
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
      setBlocked(name: string, blocked: boolean): Promise<void>;
      now(): number;
    };
  }
}
