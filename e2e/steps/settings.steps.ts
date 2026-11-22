// Settings steps: the two-pane settings sheet, its pickers/editors, the
// parental PIN prompts and the automatic backup. Every ACTION is a key
// press; assertions read the DOM (data-row-id / role / aria-checked) and
// the browser storage the app itself writes to.
import type { Locator, Page } from '@playwright/test';
import { Given, Then, When, FIXTURE_HOST, expect } from './world';

const SHEET = '[data-testid="settings-sheet"]';
const fixtureHost = new URL(FIXTURE_HOST).hostname;

/** Android feature text names the dev host 10.0.2.2; the web fixture serves from 127.0.0.1. */
function mapFixtureText(text: string): string {
  return text.replaceAll('10.0.2.2', fixtureHost);
}

/** The focusable row showing `text` (the Android harness's RequestFocus idiom), then OK. */
async function selectRow(page: Page, text: string, locator?: Locator): Promise<void> {
  const node = locator ?? page.locator('[data-focus-id]').filter({ hasText: text }).first();
  await expect(node).toBeVisible();
  await node.evaluate((el) => (el as HTMLElement).focus());
  await expect(node).toBeFocused();
  await page.keyboard.press('Enter');
}

/** The settings row titled `title` (interactive or locked). */
function rowTitled(page: Page, title: string): Locator {
  return page.locator(`${SHEET} [data-row-id]`).filter({ hasText: title }).first();
}

/**
 * Settings opens from the guide rail's gear (or the playback quick-bar); from
 * fullscreen playback BACK returns to the guide first. Key-only navigation.
 */
/** Presses BACK until the route is the guide (playback overlays consume the first BACKs). */
async function backToGuide(page: Page): Promise<void> {
  const root = page.getByTestId('app-root');
  await expect
    .poll(async () => {
      if ((await root.getAttribute('data-route')) === 'Guide') return true;
      await page.keyboard.press('Escape');
      return false;
    })
    .toBe(true);
}

Given('I open Settings', async ({ world }) => {
  const { page } = world;
  await expect(page.getByTestId('app-root')).toHaveAttribute('data-route', /Playback|Guide/);
  await backToGuide(page);
  // The rail lives in the groups column (capture 25); BACK on the bare grid opens it.
  await expect(page.getByTestId('guide-loading')).toHaveCount(0);
  if (!(await page.getByTestId('guide-groups').isVisible())) await world.press('Escape');
  await expect(page.getByTestId('guide-groups')).toBeVisible();
  await selectRow(page, 'Settings', page.locator('[data-focus-id="guide-rail-settings"]'));
  await expect(page.locator(SHEET)).toBeVisible();
});

Then('I see the sections {string} in order', async ({ world }, list: string) => {
  const names = list.split(',').map((name) => name.trim());
  const tops: number[] = [];
  for (const name of names) {
    const row = rowTitled(world.page, name);
    await expect(row).toBeVisible();
    tops.push((await row.boundingBox())?.y ?? Number.NaN);
  }
  expect(tops).toEqual([...tops].sort((a, b) => a - b));
});

When('I open the {string} section', async ({ world }, name: string) => world.select(name));

Then('the {string} toggle is on', async ({ world }, title: string) => {
  await expect(rowTitled(world.page, title)).toHaveAttribute('aria-checked', 'true');
});

Then('the {string} toggle is off', async ({ world }, title: string) => {
  await expect(rowTitled(world.page, title)).toHaveAttribute('aria-checked', 'false');
});

/** A pending text edit commits like the Android IME action before the row is read back. */
async function commitPendingEdit(page: Page): Promise<void> {
  if (await page.getByTestId('settings-text-edit').isVisible()) await page.keyboard.press('Enter');
}

Then('the {string} row shows {string}', async ({ world }, title: string, value: string) => {
  await commitPendingEdit(world.page);
  await expect(rowTitled(world.page, title)).toContainText(mapFixtureText(value));
});

Then('the row {string} is not locked', async ({ world }, title: string) => {
  const row = rowTitled(world.page, title);
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute('data-focus-id', /.+/);
  await expect(row).not.toHaveAttribute('aria-disabled', 'true');
});

Then('the row {string} is locked', async ({ world }, title: string) => {
  await expect(rowTitled(world.page, title)).toHaveAttribute('aria-disabled', 'true');
});

Then('EPG data older than {int} hours is due for refresh', async ({ world }, hours: number) => {
  expect(await world.page.evaluate(() => localStorage.getItem('telly:epg_update_interval_hours'))).toBe(
    String(hours),
  );
});

Then('EPG data fresher than {int} hours is not due for refresh', async ({ world }, hours: number) => {
  // The refresh policy is `isRefreshDue(last, now, hours * 3600_000)`: fresher than the interval is never due.
  expect(
    Number(await world.page.evaluate(() => localStorage.getItem('telly:epg_update_interval_hours'))),
  ).toBe(hours);
});

/** Spins the four wheels to `pin` (UP = +1 from 0, RIGHT = next wheel) and commits with OK. */
async function spinPinWheels(page: Page, pin: string): Promise<void> {
  await expect(page.locator(PIN_WHEEL).first()).toBeVisible();
  for (const [index, digit] of [...pin].entries()) {
    for (let i = 0; i < Number(digit); i += 1) await page.keyboard.press('ArrowUp');
    if (index < pin.length - 1) await page.keyboard.press('ArrowRight');
  }
  await page.keyboard.press('Enter');
}

/** Masked keyboard entry ("PIN input method" = Keyboard): 4 digits commit. */
const PIN_WHEEL = '[data-testid="pin-wheel"]';
const PIN_FIELD = '[data-testid="pin-keyboard"], [data-testid="pin-input"]';

async function typePinOnKeyboard(page: Page, pin: string): Promise<void> {
  await expect(page.locator(PIN_FIELD).first()).toBeFocused();
  await page.keyboard.type(pin);
}

/** Every PIN prompt: wheels or the masked field, whichever the input method shows. */
async function enterPin(page: Page, pin: string): Promise<void> {
  await expect(page.locator(`${PIN_WHEEL}, ${PIN_FIELD}`).first()).toBeVisible();
  if (await page.locator(PIN_FIELD).first().isVisible()) await typePinOnKeyboard(page, pin);
  else await spinPinWheels(page, pin);
}

When('I set the PIN to {string}', async ({ world }, pin: string) => {
  await world.seeText('Change PIN');
  await spinPinWheels(world.page, pin);
});

When('I type the PIN {string} on the keyboard', async ({ world }, pin: string) =>
  typePinOnKeyboard(world.page, pin),
);

When('I enter the PIN {string}', async ({ world }, pin: string) => enterPin(world.page, pin));

Then('the sheet asks for the PIN', async ({ world }) => {
  await expect(world.page.locator(`${SHEET} ${PIN_WHEEL}, ${SHEET} ${PIN_FIELD}`).first()).toBeVisible();
});

/** BACKs out of the settings shell (every sheet + overlay). */
async function closeSheets(page: Page): Promise<void> {
  await expect
    .poll(async () => {
      if ((await page.locator(SHEET).count()) === 0) return true;
      await page.keyboard.press('Escape');
      return false;
    })
    .toBe(true);
}

const PLAYBACK_CHROME =
  '[data-testid="channel-panel"], [data-testid="info-title"], [data-testid="quick-bar"], [data-testid="channel-menu"], [data-testid="playback-message"]';

/** Settings was entered from the guide: RIGHT closes the groups column, OK on the focused cell plays fullscreen. */
async function toFullscreenPlayback(page: Page): Promise<void> {
  const root = page.getByTestId('app-root');
  if ((await root.getAttribute('data-route')) !== 'Guide') return;
  await expect
    .poll(async () => {
      if (!(await page.getByTestId('guide-groups').isVisible())) return true;
      await page.keyboard.press('ArrowRight');
      return false;
    })
    .toBe(true);
  await page.keyboard.press('Enter');
  await expect(root).toHaveAttribute('data-route', 'Playback');
}

/** Android `dismissChrome`: BACK while an overlay is up; bare playback must not see a BACK (it would reopen the guide). */
async function dismissChrome(page: Page): Promise<void> {
  await expect
    .poll(async () => {
      if ((await page.locator(PLAYBACK_CHROME).count()) === 0) return true;
      await page.keyboard.press('Escape');
      return false;
    })
    .toBe(true);
}

/** Leaves the shell and lands where the Android flow does: fullscreen playback. */
async function leaveSettings(page: Page): Promise<void> {
  await closeSheets(page);
  await toFullscreenPlayback(page);
}

When('I leave settings', async ({ world }) => leaveSettings(world.page));

When('I leave settings for fullscreen playback', async ({ world }) => {
  await leaveSettings(world.page);
  await dismissChrome(world.page);
});

Then('no settings sheet is open', async ({ world }) => {
  await expect(world.page.locator(SHEET)).toHaveCount(0);
});

Then('the parental controls master row reads {string}', async ({ world }, state: string) => {
  await expect(world.page.locator(`${SHEET} [data-row-id="parental.master"]`)).toHaveText(state);
});

Then('parental controls are not enabled in the store', async ({ world }) => {
  const stored = await world.page.evaluate(() => [
    localStorage.getItem('telly:parental_enabled'),
    localStorage.getItem('telly:parental_pin_hash'),
  ]);
  expect(stored[0]).not.toBe('true');
  expect(stored[1] ?? '').toBe('');
});

/** Arranged through the real store (same salt+hash scheme as `pinHasher.ts`), like the Android step. */
Given('parental controls protect telly with the PIN {string}', async ({ world }, pin: string) => {
  await world.page.evaluate(async (raw) => {
    const hex = (bytes: Uint8Array): string =>
      [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${raw}`));
    window.telly.setSetting('parental_pin_salt', salt);
    window.telly.setSetting('parental_pin_hash', hex(new Uint8Array(digest)));
    window.telly.setSetting('parental_enabled', 'true');
  }, pin);
});

When('the group {string} is locked', async ({ world }, group: string) => {
  await world.page.evaluate((name) => window.telly.setSetting('parental_locked_groups', name), group);
});

/** Fullscreen playback → channel panel (OK, DOWN) → groups column (LEFT) → the group. */
async function openGroupFromPanel(page: Page, group: string): Promise<void> {
  await dismissChrome(page);
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('channel-panel')).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await selectRow(page, group, page.getByTestId(`panel-group-${group}`));
}

Then('opening the group {string} requires the PIN', async ({ world }, group: string) => {
  await leaveSettings(world.page);
  await openGroupFromPanel(world.page, group);
  await world.seeText('Enter PIN');
});

Then('entering the PIN {string} unlocks it', async ({ world }, pin: string) => {
  await enterPin(world.page, pin);
  await world.notSeeText('Enter PIN');
  await world.seeText('Movie House');
});

Then('opening the group {string} does not require the PIN', async ({ world }, group: string) => {
  await selectRow(world.page, group, world.page.getByTestId(`panel-group-${group}`));
  await world.notSeeText('Enter PIN');
  await world.seeText('News One');
});

/** The playlist row for the named fixture host (the name itself is the wizard's, the URL is the identity). */
function playlistRow(page: Page, name: string): Locator {
  const mapped = mapFixtureText(name);
  const byUrl = page
    .locator(`${SHEET} [data-row-id^="playlist:"]`)
    .filter({ has: page.locator(`[data-row-id*="${mapped}"]`) });
  const byName = page.locator(`${SHEET} [data-row-id^="playlist:"]`).filter({ hasText: mapped });
  return byName
    .or(page.locator(`${SHEET} [data-row-id^="playlist:"][data-row-id*="${mapped}"]`))
    .or(byUrl)
    .first();
}

When('I activate the playlist {string}', async ({ world }, name: string) => {
  await selectRow(world.page, name, playlistRow(world.page, name));
});

Then('the playlists section lists {string}', async ({ world }, name: string) => {
  const { page } = world;
  await commitPendingEdit(page);
  await expect
    .poll(async () => {
      if ((await page.getByText('Add playlist').count()) > 0) return true;
      await page.keyboard.press('Escape');
      return false;
    })
    .toBe(true);
  await expect(playlistRow(page, name)).toBeVisible();
});

Then('the channel panel group list does not include {string}', async ({ world }, group: string) => {
  const { page } = world;
  await leaveSettings(page);
  await dismissChrome(page);
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('channel-panel')).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('panel-group-All channels')).toBeVisible();
  await expect(page.getByTestId(`panel-group-${group}`)).toHaveCount(0);
});

Then(
  'the automatic backup file eventually contains the playlist {string}',
  async ({ world }, url: string) => {
    await expect
      .poll(
        () =>
          world.page.evaluate(async () => {
            try {
              const root = await navigator.storage.getDirectory();
              const handle = await root.getFileHandle('telly-backup.json');
              return await (await handle.getFile()).text();
            } catch {
              return null;
            }
          }),
        { timeout: 20_000 },
      )
      .toContain(mapFixtureText(url));
  },
);
