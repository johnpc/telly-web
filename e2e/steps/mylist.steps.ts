// Steps for the My list / favorites-management slice: the My List screen
// behind the rail bookmark and the Manage Favorites / Reorder channels editors.
import { Then, When, expect } from './world';
import { channelNamed, nextProgramme, nowProgramme } from './search.steps';

When('I select the My List row {string}', async ({ world }, channelName: string) => {
  await world.select(channelName, 'mylist-screen');
});

Then(
  'the My List rows are the upcoming programme of {string} then the current programme of {string}',
  async ({ world }, upcomingChannel: string, currentChannel: string) => {
    const now = Date.now();
    const upcoming = nextProgramme(channelNamed(upcomingChannel).tvgId, now)?.title ?? '';
    const current = nowProgramme(channelNamed(currentChannel).tvgId, now)?.title ?? '';
    const rows = world.page.getByTestId('mylist-row');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText(upcomingChannel);
    await expect(rows.nth(0).getByTestId('mylist-title')).toContainText(upcoming);
    await expect(rows.nth(1)).toContainText(currentChannel);
    await expect(rows.nth(1).getByTestId('mylist-title')).toContainText(current);
  },
);

Then(
  'I see the description of the upcoming programme of {string}',
  async ({ world }, channelName: string) => {
    const upcoming = nextProgramme(channelNamed(channelName).tvgId, Date.now());
    await expect(world.page.getByTestId('mylist-description')).toContainText(upcoming?.description ?? '');
  },
);

When('I focus the channel row {string}', async ({ world }, name: string) => {
  await world.focus(name, 'channel-edit-list');
});

Then('the channel row {string} is marked favorite', async ({ world }, name: string) => {
  const row = world.page.locator(`[data-testid="channel-edit-row"][data-channel-name="${name}"]`);
  await expect(row).toHaveAttribute('data-favorite', 'true');
});

Then('the channel row {string} is listed above {string}', async ({ world }, above: string, below: string) => {
  const rows = world.page.getByTestId('channel-edit-row');
  await expect(rows.filter({ hasText: above }).first()).toBeVisible();
  const names = await rows.evaluateAll((els) => els.map((el) => el.getAttribute('data-channel-name') ?? ''));
  const indexOf = (name: string): number => names.indexOf(name);
  expect(indexOf(above)).toBeGreaterThanOrEqual(0);
  expect(indexOf(above)).toBeLessThan(indexOf(below));
});

Then('the channel column lists {string} above {string}', async ({ world }, above: string, below: string) => {
  const column = world.page.getByTestId('guide-channel-column');
  await expect(column).toContainText(above);
  const text = await column.innerText();
  expect(text.indexOf(above)).toBeLessThan(text.indexOf(below));
});
