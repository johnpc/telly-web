// Multiview steps (port of the Android MultiviewSteps). Every ACTION is a key
// press; focusing a row by name is the harness's RequestFocus equivalent.
// Assertions read the multiview slice's data-testids: `multiview-screen`
// (data-layer / data-pane-count), `multiview-pane` (data-channel-name,
// data-audio = audio|muted, data-focused), `multiview-menu` + its
// `multiview-menu-row`s, `multiview-picker` with `multiview-picker-list`,
// `multiview-schedule`, `multiview-detail` and the shared `panel-row-<id>`s.
import type { Locator, Page } from '@playwright/test';
import { ensureQuickBar } from './playback.steps';
import { Given, Then, When, expect, type TellyWorld } from './world';

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exact = (text: string): RegExp => new RegExp(`^${escapeRegExp(text)}$`);
const quotedNames = (raw: string): string[] => [...raw.matchAll(/"([^"]+)"/g)].map((m) => m[1] ?? '');

const panes = (page: Page): Locator => page.getByTestId('multiview-pane');
const paneNamed = (page: Page, name: string): Locator =>
  page.locator(`[data-testid="multiview-pane"][data-channel-name="${name}"]`);
const picker = (page: Page): Locator => page.getByTestId('multiview-picker');

/** Quick-bar → Multiview slot → the single-pane teaser is up. */
async function openMultiview(world: TellyWorld): Promise<void> {
  const { page } = world;
  await ensureQuickBar(page, () => world.longPressOk());
  await world.select('Multiview', 'quick-bar');
  await expect(page.getByTestId('app-root')).toHaveAttribute('data-route', 'Multiview');
  await expect(panes(page)).toHaveCount(1);
}

/** Focuses the picker row named `name` (RequestFocus) and presses OK. */
async function pickChannel(page: Page, name: string): Promise<void> {
  await expect(picker(page)).toBeVisible();
  const row = picker(page)
    .locator('[data-testid^="panel-row-"]')
    .filter({ has: page.getByTestId('row-name').filter({ hasText: exact(name) }) })
    .first();
  await expect(row).toBeVisible();
  await row.evaluate((el) => (el as HTMLElement).focus());
  await expect(row).toBeFocused();
  await page.keyboard.press('Enter');
}

Given('I opened multiview', async ({ world }) => openMultiview(world));

Given('I opened multiview with a second screen {string}', async ({ world }, name: string) => {
  await openMultiview(world);
  await world.press('Enter');
  await world.select('Add screen', 'multiview-menu');
  await pickChannel(world.page, name);
  await expect(panes(world.page)).toHaveCount(2);
});

Then('I see {int} multiview pane(s)', async ({ world }, count: number) => {
  await expect(world.page.getByTestId('app-root')).toHaveAttribute('data-route', 'Multiview');
  await expect(panes(world.page)).toHaveCount(count);
});

Then(/^I see the multiview menu rows (.+)$/, async ({ world }, rawList: string) => {
  const rows = world.page.getByTestId('multiview-menu').getByTestId('multiview-menu-row');
  for (const label of quotedNames(rawList))
    await expect(rows.filter({ hasText: exact(label) })).toBeVisible();
});

When('I pick the channel {string} in the multiview picker', async ({ world }, name: string) =>
  pickChannel(world.page, name),
);

Then('the multiview channel picker shows the list, schedule and detail panes', async ({ world }) => {
  const { page } = world;
  await expect(picker(page)).toBeVisible();
  await expect(
    page.getByTestId('multiview-picker-list').locator('[data-testid^="panel-row-"]').first(),
  ).toBeVisible();
  await expect(page.getByTestId('multiview-schedule').locator('li').first()).toBeVisible();
  await expect(page.getByTestId('multiview-detail')).not.toHaveText(/^\s*$/);
});

Then('the multiview pane {string} is focused with audio', async ({ world }, name: string) => {
  const pane = paneNamed(world.page, name);
  await expect(pane).toHaveAttribute('data-focused', 'true');
  await expect(pane).toHaveAttribute('data-audio', 'audio');
  await expect(pane).toBeFocused();
});

Then('the multiview pane {string} is muted', async ({ world }, name: string) => {
  const pane = paneNamed(world.page, name);
  await expect(pane).toHaveAttribute('data-audio', 'muted');
  await expect(pane).not.toHaveAttribute('data-focused', 'true');
});
