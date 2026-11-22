// EPG data-foundation steps. The scenarios specify the PERSISTED guide data,
// so assertions read the app's real database through `window.telly` (the
// Android steps query Room the same way) while the app does the fetching.
import type { Page } from '@playwright/test';
import { Given, Then, When, FIXTURE_HOST, expect } from './world';

interface StoredChannel {
  tvgId: string | null;
  number: number;
  favorite: boolean;
}

interface StoredProgram {
  title: string;
  startMs: number;
  endMs: number;
  description: string | null;
}

/** The `window.telly` seams this leg uses (`src/features/onboarding/onboardingTestHooks.ts`). */
interface EpgTestHooks {
  refreshGateState(): string;
  channel(name: string): Promise<StoredChannel | null>;
  programs(tvgId: string, fromMs: number, toMs: number): Promise<StoredProgram[]>;
  programCount(): Promise<number>;
  setFavorite(name: string, favorite: boolean): Promise<void>;
  refreshPlaylist(url: string): Promise<void>;
}

type TellyWindow = Window & { telly: EpgTestHooks };

interface FixtureProgramme {
  title: string;
  startMs: number;
  endMs: number;
}

const EPG_PATH = '/epg.xml';
/** `/epg.xml` requests seen on the page since the Background attached the counter. */
const epgRequests = new WeakMap<Page, { count: number }>();

function countEpgRequests(page: Page): { count: number } {
  const existing = epgRequests.get(page);
  if (existing !== undefined) return existing;
  const counter = { count: 0 };
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === EPG_PATH) counter.count += 1;
  });
  epgRequests.set(page, counter);
  return counter;
}

/** XMLTV `20261122120000 +0000` -> epoch ms (the fixture is always UTC). */
function xmltvMs(stamp: string): number {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(stamp);
  if (m === null) throw new Error(`bad XMLTV stamp ${stamp}`);
  const [y, mo, d, h, mi, s] = m.slice(1, 7).map(Number);
  return Date.UTC(y ?? 0, (mo ?? 1) - 1, d ?? 1, h ?? 0, mi ?? 0, s ?? 0);
}

/** The served fixture's programmes for one channel id, sorted by start. */
async function fixtureProgrammes(source: string, tvgId: string): Promise<FixtureProgramme[]> {
  const xml = await (await fetch(`${FIXTURE_HOST}/${source}`)).text();
  const out: FixtureProgramme[] = [];
  const re = /<programme start="([^"]+)" stop="([^"]+)" channel="([^"]+)">\s*<title[^>]*>([^<]*)<\/title>/g;
  for (const m of xml.matchAll(re)) {
    if (m[3] === tvgId)
      out.push({ title: decodeXml(m[4] ?? ''), startMs: xmltvMs(m[1] ?? ''), endMs: xmltvMs(m[2] ?? '') });
  }
  return out.sort((a, b) => a.startMs - b.startMs);
}

function decodeXml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function storedChannelTvgId(page: Page, name: string): Promise<string> {
  const channel = await page.evaluate((n) => (window as unknown as TellyWindow).telly.channel(n), name);
  if (channel === null || channel.tvgId === null) throw new Error(`channel ${name} not stored`);
  return channel.tvgId;
}

Given('the fixture EPG is served at {string}', async ({ world }, url: string) => {
  expect(url).toBe(`${FIXTURE_HOST}${EPG_PATH}`);
  countEpgRequests(world.page);
});

Given('an alternative fixture EPG is served at {string}', async ({ world }, url: string) => {
  expect(url).toBe(`${FIXTURE_HOST}/epg-alt.xml`);
  countEpgRequests(world.page);
});

Given('"Update EPG on playlists change" is on', async ({ world }) => {
  await world.page.evaluate(() => window.telly.setSetting('epg_update_on_playlists_change', 'true'));
});

/** Programmes are stored AND every queued refresh has drained (the gate is idle). */
When('the EPG update completes', async ({ world }) => {
  await expect
    .poll(
      () =>
        world.page.evaluate(
          async () =>
            (await (window as unknown as TellyWindow).telly.programCount()) > 0 &&
            (window as unknown as TellyWindow).telly.refreshGateState() === 'Idle',
        ),
      { timeout: 60_000 },
    )
    .toBe(true);
});

/** A fixed observation window, not a wait for a condition: absence is what is asserted. */
Then('the EPG is not downloaded again within {int} seconds', async ({ world }, seconds: number) => {
  const counter = countEpgRequests(world.page);
  const settled = counter.count;
  await world.page.waitForTimeout(seconds * 1000);
  expect(
    counter.count - settled,
    `EPG re-downloaded ${counter.count - settled} time(s) after the first refresh`,
  ).toBe(0);
});

Then(
  'the guide data contains program titles from {string} for channel {string}',
  async ({ world }, source: string, channelName: string) => {
    const tvgId = await storedChannelTvgId(world.page, channelName);
    const expected = await fixtureProgrammes(source, tvgId);
    expect(expected.length).toBeGreaterThan(0);
    const first = expected[0]?.startMs ?? 0;
    const last = expected[expected.length - 1]?.endMs ?? 0;
    await expect
      .poll(
        async () => {
          const stored = await world.page.evaluate(
            ([id, from, to]) => (window as unknown as TellyWindow).telly.programs(id, from, to),
            [tvgId, first, last] as const,
          );
          return stored.map(({ title, startMs, endMs }) => ({ title, startMs, endMs }));
        },
        { timeout: 60_000 },
      )
      .toEqual(expected);
  },
);

Then(
  'the program for {string} airing now has a start time, an end time and a description',
  async ({ world }, channelName: string) => {
    const tvgId = await storedChannelTvgId(world.page, channelName);
    const now = Date.now();
    const airing = await world.page.evaluate(
      ([id, at]) => (window as unknown as TellyWindow).telly.programs(id, at, at + 1),
      [tvgId, now] as const,
    );
    expect(airing).toHaveLength(1);
    expect(airing[0]?.startMs).toBeLessThanOrEqual(now);
    expect(airing[0]?.endMs).toBeGreaterThan(now);
    expect(airing[0]?.description ?? '').not.toBe('');
  },
);

Then('channel {string} has number {int}', async ({ world }, name: string, number: number) => {
  await expect
    .poll(() => world.page.evaluate((n) => (window as unknown as TellyWindow).telly.channel(n), name))
    .toMatchObject({ number });
});

// The channel panel's "Add to Favorites" row is the playback slice's surface;
// until it lands the flag is written through the store, as the data this
// scenario specifies (favorites surviving a refresh) lives in the channel row.
Given('I marked channel {string} as a favorite', async ({ world }, name: string) => {
  await world.page.evaluate((n) => (window as unknown as TellyWindow).telly.setFavorite(n, true), name);
  await expect
    .poll(() => world.page.evaluate((n) => (window as unknown as TellyWindow).telly.channel(n), name))
    .toMatchObject({ favorite: true });
});

// Settings -> Playlists -> "Update playlist" is the settings slice's surface;
// the same refresh path runs through the hook meanwhile.
When('the playlist is refreshed from the same URL', async ({ world }) => {
  await world.page.evaluate(
    (url) => (window as unknown as TellyWindow).telly.refreshPlaylist(url),
    `${FIXTURE_HOST}/playlist.m3u`,
  );
});

Then('channel {string} is still a favorite', async ({ world }, name: string) => {
  await expect
    .poll(() => world.page.evaluate((n) => (window as unknown as TellyWindow).telly.channel(n), name))
    .toMatchObject({ favorite: true });
});
