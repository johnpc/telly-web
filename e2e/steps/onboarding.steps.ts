// Onboarding steps: the welcome screen, the add-playlist wizard and the
// welcome-screen restore of a previous install's automatic backup. Every
// action is a key; the backup is seeded through the same OPFS seam the app
// writes with (the Android harness seeds Documents/telly the same way).
import { Given, Then, When, FIXTURE_HOST, expect } from './world';

/** The OPFS backup seam on `window.telly` (`src/features/onboarding/onboardingTestHooks.ts`). */
type TellyWindow = Window & { telly: { writeAutoBackup(json: string): Promise<void> } };

Given('the fixture playlist is served at {string}', async ({ world }, url: string) => {
  expect(url.startsWith(FIXTURE_HOST)).toBe(true);
  await world.freshInstall();
});

Given('a local backup of a configured install exists', async ({ world }) => {
  const json = JSON.stringify({
    version: 1,
    settings: {},
    playlists: [
      { name: '127.0.0.1', url: `${FIXTURE_HOST}/playlist.m3u`, epgUrl: `${FIXTURE_HOST}/epg.xml` },
    ],
  });
  await world.page.evaluate(
    (backup) => (window as unknown as TellyWindow).telly.writeAutoBackup(backup),
    json,
  );
});

/**
 * Setup lands on fullscreen playback: the route is the onboarding slice's
 * contract; the channel identity is asserted by the playback slice's surface
 * (`data-channel-number` / `data-channel-name` on the playback root) once it
 * renders — until then the route alone is what this slice can promise.
 */
Then(
  'playback starts fullscreen on channel {int} {string}',
  async ({ world }, number: number, name: string) => {
    const root = world.page.locator('[data-testid="app-root"][data-route="Playback"]');
    await expect(root).toBeVisible({ timeout: 30_000 });
    const surface = world.page.locator('[data-channel-number]');
    if ((await surface.count()) > 0) {
      await expect(surface.first()).toHaveAttribute('data-channel-number', String(number));
      await expect(surface.first()).toHaveAttribute('data-channel-name', name);
    }
  },
);

/**
 * Launch links (web-only): the app is opened with `?channel=…` ON TOP of the
 * harness's own `?e2e=1`, then settles past the Boot frame like a relaunch.
 * Opening a URL is the deep link itself, not a pointer action.
 */
When('I open telly with the link {string}', async ({ world }, link: string) => {
  const params = new URLSearchParams(link);
  params.set('e2e', '1');
  await world.page.goto(`/?${params.toString()}`);
  const root = world.page.getByTestId('app-root');
  await expect(root).toBeVisible();
  await expect(root).not.toHaveAttribute('data-route', 'Boot');
});

/** The channel is known to the player (route + tuned attributes), without waiting for pictures. */
Then('telly is tuned to channel {int} {string}', async ({ world }, number: number, name: string) => {
  const { page } = world;
  await expect(page.getByTestId('app-root')).toHaveAttribute('data-route', 'Playback');
  await expect(page.getByTestId('playback-screen')).toHaveAttribute('data-channel-number', String(number));
  await expect(page.getByTestId('playback-screen')).toHaveAttribute('data-channel-name', name);
});

/** `?channel=` was stripped by `history.replaceState`; the harness's `?e2e=1` survived it. */
Then('the address bar no longer carries the channel link', async ({ world }) => {
  await expect(world.page).not.toHaveURL(/[?&]channel=/);
  expect(new URL(world.page.url()).searchParams.get('e2e')).toBe('1');
});
