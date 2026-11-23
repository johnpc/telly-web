// Catch-up steps (port of the Android CatchupSteps). Every ACTION is a key
// press; assertions read the playback slice's `transport-row[data-catchup]`
// (Android's `catchup-transport` tag), `transport-elapsed` /
// `transport-duration` readouts, `info-channel`, the chrome's `data-overlay`
// and the guide's `guide-cell-menu`.
import type { Locator, Page } from '@playwright/test';
import { FIXTURE_HOST, Then, When, expect } from './world';

interface FixtureChannel {
  number: number;
  tvgId: string;
  name: string;
}

interface FixtureProgramme {
  tvgId: string;
  startMs: number;
  endMs: number;
  title: string;
  subTitle: string;
}

const DAY_MS = 24 * 3_600_000;
/** Comfortably past the transport's ~5.35 s auto-hide (the Android step's PIN_PROVE_MS). */
const PIN_PROVE_MS = 6_500;
/** Covers a full natural play-out of the 60 s fixture archive. */
const ARCHIVE_END_TIMEOUT_MS = 90_000;
const POSITION_READOUT = /\d{2}:\d{2}/;
const DURATION_READOUT = /\/ .*\d{2}:\d{2}/;

let channelsCache: FixtureChannel[] | null = null;
let programmesCache: FixtureProgramme[] | null = null;

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const channelLabel = (number: number, name: string): RegExp =>
  new RegExp(`^${number}\\s+${escapeRegExp(name)}$`);
const unescapeXml = (s: string): string =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

function xmltvMs(stamp: string): number {
  const [, y, mo, d, h, mi, s] = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(stamp) ?? [];
  return Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
}

async function fixtureChannels(page: Page): Promise<FixtureChannel[]> {
  if (channelsCache) return channelsCache;
  const text = await (await page.request.get(`${FIXTURE_HOST}/playlist.m3u`)).text();
  channelsCache = [...text.matchAll(/#EXTINF:[^\n]*tvg-id="([^"]+)"[^\n]*,([^\n]+)\n/g)].map((m, i) => ({
    number: i + 1,
    tvgId: m[1] ?? '',
    name: (m[2] ?? '').trim(),
  }));
  return channelsCache;
}

async function fixtureProgrammes(page: Page): Promise<FixtureProgramme[]> {
  if (programmesCache) return programmesCache;
  const xml = await (await page.request.get(`${FIXTURE_HOST}/epg.xml`)).text();
  const tag = (body: string, name: string): string =>
    unescapeXml(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(body)?.[1] ?? '');
  programmesCache = [
    ...xml.matchAll(/<programme start="([^"]+)" stop="([^"]+)" channel="([^"]+)">([\s\S]*?)<\/programme>/g),
  ].map((m) => ({
    tvgId: m[3] ?? '',
    startMs: xmltvMs(m[1] ?? ''),
    endMs: xmltvMs(m[2] ?? ''),
    title: tag(m[4] ?? '', 'title'),
    subTitle: tag(m[4] ?? '', 'sub-title'),
  }));
  return programmesCache;
}

/** The fixture programme airing on channel `number` at `atMs`. */
async function programmeAt(page: Page, number: number, atMs: number): Promise<FixtureProgramme> {
  const channel = (await fixtureChannels(page))[number - 1];
  if (!channel) throw new Error(`no fixture channel number ${number}`);
  const hit = (await fixtureProgrammes(page)).find(
    (p) => p.tvgId === channel.tvgId && p.startMs <= atMs && atMs < p.endMs,
  );
  if (!hit)
    throw new Error(`fixture EPG has no programme on ${channel.tvgId} at ${new Date(atMs).toISOString()}`);
  return hit;
}

/** The programme a −24 h day jump lands on for the channel's row. */
const yesterdays = (page: Page, number: number): Promise<FixtureProgramme> =>
  programmeAt(page, number, Date.now() - DAY_MS);
/** "Title: Sub-title" — the start of the display title the cells and overlays render. */
const displayTitle = (p: FixtureProgramme): string => `${p.title}: ${p.subTitle}`;

const chrome = (page: Page): Locator => page.getByTestId('playback-chrome');
const catchupTransport = (page: Page): Locator =>
  page.locator('[data-testid="transport-row"][data-catchup="true"]');

/** Re-opens the transport until it is up: UP opens the info overlay, a second UP expands the transport row. */
async function ensureCatchupTransport(page: Page): Promise<void> {
  await expect
    .poll(async () => {
      if (await catchupTransport(page).isVisible()) return true;
      await page.keyboard.press('ArrowUp');
      return false;
    })
    .toBe(true);
}

/** BACK clears each overlay layer; stops at bare playback (where BACK would leave the player). */
async function dismissChrome(page: Page): Promise<void> {
  await expect
    .poll(async () => {
      if ((await chrome(page).getAttribute('data-overlay')) === 'None') return true;
      await page.keyboard.press('Escape');
      return false;
    })
    .toBe(true);
}

// Web deviation (guide slice): arrows auto-repeat in browsers, so the guide's day jumps ride on RW / FF.
// `MediaTrackPrevious` is the RW key name Playwright's keyboard knows (remoteKeys.ts decodes it to REWIND).
When('I long-press dpad left', async ({ world }) => world.page.keyboard.press('MediaTrackPrevious'));

Then("the guide shows yesterday's programme on channel {int}", async ({ world }, number: number) => {
  await world.seeText(displayTitle(await yesterdays(world.page, number)));
});

Then(
  "catch-up playback starts for yesterday's programme on channel {int}",
  async ({ world }, number: number) => {
    const { page } = world;
    const channel = (await fixtureChannels(page))[number - 1];
    if (!channel) throw new Error(`no fixture channel number ${number}`);
    await expect(page.getByTestId('app-root')).toHaveAttribute('data-route', 'Playback');
    // The guide is gone (fullscreen playback) and the transport-bearing info
    // overlay identifies the archived programme, not the airing one.
    await expect(catchupTransport(page)).toBeVisible();
    await world.seeText(displayTitle(await yesterdays(page, number)));
    await expect(page.getByTestId('info-channel')).toHaveText(channelLabel(channel.number, channel.name));
  },
);

Then('the seek transport shows the position readout', async ({ world }) => {
  const { page } = world;
  await ensureCatchupTransport(page);
  await expect(catchupTransport(page).getByTestId('transport-elapsed')).toHaveText(POSITION_READOUT);
  await expect(catchupTransport(page).getByTestId('transport-duration')).toHaveText(DURATION_READOUT);
});

/** Focuses a transport button by its accessible label (the Android harness's semantics select), then OK. */
When('I activate the catch-up transport {string} button', async ({ world }, label: string) => {
  const { page } = world;
  await ensureCatchupTransport(page);
  const button = catchupTransport(page).locator(`[data-focus-id][aria-label="${label}"]`);
  await expect(button).toBeVisible();
  await button.evaluate((el) => (el as HTMLElement).focus());
  await expect(button).toBeFocused();
  await page.keyboard.press('Enter');
});

Then('catch-up playback is paused with the transport pinned', async ({ world }) => {
  const { page } = world;
  // The ⏸ slot's icon/semantics flip to Resume the moment pause lands.
  await expect(catchupTransport(page).locator('[aria-label="Resume"]')).toBeVisible();
  // Pinned = still up well past the auto-hide (VOD pin idiom); only elapsed time can prove that.
  await page.waitForTimeout(PIN_PROVE_MS);
  await expect(catchupTransport(page)).toBeVisible();
  await expect(catchupTransport(page).locator('[aria-label="Resume"]')).toBeVisible();
});

Then(
  "catch-up playback shows the programme before yesterday's on channel {int}",
  async ({ world }, number: number) => {
    const { page } = world;
    const yesterday = await yesterdays(page, number);
    const previous = await programmeAt(page, number, yesterday.startMs - 1);
    await expect(catchupTransport(page)).toBeVisible();
    await world.seeText(displayTitle(previous));
  },
);

Then('the archive ends and live playback of channel {int} resumes', async ({ world }, number: number) => {
  const { page } = world;
  // The end-of-archive retune leaves catch-up mode; re-opening the transport
  // shows the live row again (LIVE badge, no catch-up tag).
  await expect
    .poll(
      async () => {
        if (await page.getByTestId('transport-row').getByText('LIVE', { exact: true }).isVisible())
          return true;
        await page.keyboard.press('ArrowUp');
        return false;
      },
      { timeout: ARCHIVE_END_TIMEOUT_MS },
    )
    .toBe(true);
  await expect(catchupTransport(page)).toHaveCount(0);
  await expect(page.getByTestId('playback-screen')).toHaveAttribute('data-channel-number', String(number));
  await world.seeText(displayTitle(await programmeAt(page, number, Date.now())));
});

/**
 * The sheet's Hide row zapped away WITHOUT the zap overlay (the panel stays
 * up), so prove live mode through the info overlay: the tuned channel is the
 * neighbour and the catch-up transport/readout is gone.
 */
Then(
  'live playback of channel {int} {string} replaces the catch-up transport',
  async ({ world }, number: number, name: string) => {
    const { page } = world;
    await expect(catchupTransport(page)).toHaveCount(0);
    await dismissChrome(page);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('info-channel')).toHaveText(channelLabel(number, name));
    await expect(page.getByTestId('playback-screen')).toHaveAttribute('data-channel-name', name);
    await expect(catchupTransport(page)).toHaveCount(0);
    await expect(page.getByTestId('transport-elapsed')).toHaveCount(0);
  },
);

When('I return from catch-up playback', async ({ world }) => {
  // Clear the transport/info chrome first, then one BACK leaves the archive for the guide (the entry point).
  await dismissChrome(world.page);
  await world.press('Escape');
});

Then('the dropdown offers no {string} action', async ({ world }, label: string) => {
  await expect(world.page.getByTestId('guide-cell-menu').getByText(label, { exact: true })).toHaveCount(0);
});
