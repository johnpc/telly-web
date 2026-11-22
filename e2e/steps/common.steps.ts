import { Given, When, Then, FIXTURE_HOST, expect } from './world';

Given('the fixture playlist and EPG are served from {string}', async ({ world }, host: string) => {
  expect(host).toBe(FIXTURE_HOST);
  await world.freshInstall();
});
Given('a fresh install of telly', async ({ world }) => world.freshInstall());
Given('I completed the add-playlist wizard', async ({ world }) => world.seedSetup());
Given('I added the playlist {string}', async ({ world }, url: string) => world.seedSetup(url));
When('I relaunch telly', async ({ world }) => world.relaunch());

When('I press dpad up', async ({ world }) => world.press('ArrowUp'));
When('I press dpad down', async ({ world }) => world.press('ArrowDown'));
When('I press dpad left', async ({ world }) => world.press('ArrowLeft'));
When('I press dpad right', async ({ world }) => world.press('ArrowRight'));
When('I press dpad up {int} times', async ({ world }, n: number) => world.press('ArrowUp', n));
When('I press dpad down {int} times', async ({ world }, n: number) => world.press('ArrowDown', n));
When('I press dpad right {int} times', async ({ world }, n: number) => world.press('ArrowRight', n));
When('I press dpad left {int} times', async ({ world }, n: number) => world.press('ArrowLeft', n));
When('I press ok', async ({ world }) => world.press('Enter'));
When('I long-press ok', async ({ world }) => world.longPressOk());
When('I press back', async ({ world }) => world.press('Escape'));
When('I press menu', async ({ world }) => world.press('ContextMenu'));
When('I press channel up', async ({ world }) => world.press('PageUp'));
When('I press channel down', async ({ world }) => world.press('PageDown'));
When('I press fast-forward', async ({ world }) => world.press('MediaFastForward'));
When('I press rewind', async ({ world }) => world.press('MediaRewind'));
When('I wait {int} seconds', async ({ world }, s: number) => world.page.waitForTimeout(s * 1000));

When('I select {string}', async ({ world }, text: string) => world.select(text));
When('I activate {string}', async ({ world }, text: string) => world.select(text));
When('I choose {string}', async ({ world }, text: string) => world.select(text));
When('I type {string}', async ({ world }, text: string) => world.type(text));

Then('I see {string}', async ({ world }, text: string) => world.seeText(text));
Then('I no longer see {string}', async ({ world }, text: string) => world.notSeeText(text));
Then('{string} has focus', async ({ world }, text: string) => {
  await expect(world.page.locator('[data-focus-id]:focus').filter({ hasText: text })).toBeVisible();
});
