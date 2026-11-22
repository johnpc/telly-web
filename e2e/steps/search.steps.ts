// Steps for the search screen (Route.Search, quick-bar Search slot). Every
// action is a key press; the fixture EPG on disk gives the expected airings
// (the Android steps read the same plan off the in-process server).
import { readFileSync } from 'node:fs';
import { Given, Then, When, expect } from './world';
import { airTimeText } from '../../src/core/time/programTimes';
import { TWELVE_HOUR } from '../../src/core/time/clockStyle';

export interface FixtureChannel {
  number: number;
  tvgId: string;
  name: string;
  group: string;
}

export interface FixtureProgramme {
  channelTvgId: string;
  startMs: number;
  endMs: number;
  title: string;
  description: string;
}

const SITE = 'e2e/fixtures/site';
let channelCache: FixtureChannel[] | null = null;
let programmeCache: FixtureProgramme[] | null = null;

/** The 31 fixture channels in playlist order (number = position). */
export function fixtureChannels(): FixtureChannel[] {
  if (channelCache !== null) return channelCache;
  const m3u = readFileSync(`${SITE}/playlist.m3u`, 'utf8');
  const out: FixtureChannel[] = [];
  for (const m of m3u.matchAll(/#EXTINF:-1 tvg-id="([^"]+)"[^\n]*group-title="([^"]+)",([^\n]+)/g)) {
    const [, tvgId = '', group = '', name = ''] = m;
    if (group === 'Movies') continue;
    out.push({ number: out.length + 1, tvgId, name: name.trim(), group });
  }
  channelCache = out;
  return out;
}

function xmltvMs(stamp: string): number {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2}) ([+-])(\d{2})(\d{2})$/.exec(stamp);
  if (m === null) throw new Error(`bad XMLTV stamp ${stamp}`);
  const [, y, mo, d, h, mi, s, sign, oh, om] = m.map(Number) as unknown as number[];
  const offset = (Number(oh) * 60 + Number(om)) * 60_000 * (m[7] === '-' ? -1 : 1);
  void sign;
  return Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)) - offset;
}

const unescape = (s: string): string =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/** Every programme of the main fixture EPG. */
export function fixtureProgrammes(): FixtureProgramme[] {
  if (programmeCache !== null) return programmeCache;
  const xml = readFileSync(`${SITE}/epg.xml`, 'utf8');
  const out: FixtureProgramme[] = [];
  const re = /<programme start="([^"]+)" stop="([^"]+)" channel="([^"]+)">([\s\S]*?)<\/programme>/g;
  for (const m of xml.matchAll(re)) {
    const body = m[4] ?? '';
    out.push({
      channelTvgId: unescape(m[3] ?? ''),
      startMs: xmltvMs(m[1] ?? ''),
      endMs: xmltvMs(m[2] ?? ''),
      title: unescape(/<title[^>]*>([^<]*)<\/title>/.exec(body)?.[1] ?? ''),
      description: unescape(/<desc[^>]*>([^<]*)<\/desc>/.exec(body)?.[1] ?? ''),
    });
  }
  programmeCache = out;
  return out;
}

export const channelNamed = (name: string): FixtureChannel => {
  const channel = fixtureChannels().find((c) => c.name === name);
  if (channel === undefined) throw new Error(`no fixture channel named ${name}`);
  return channel;
};

export const nowProgramme = (tvgId: string, now: number): FixtureProgramme | undefined =>
  fixtureProgrammes().find((p) => p.channelTvgId === tvgId && p.startMs <= now && p.endMs > now);

export const nextProgramme = (tvgId: string, now: number): FixtureProgramme | undefined =>
  fixtureProgrammes()
    .filter((p) => p.channelTvgId === tvgId && p.startMs > now)
    .sort((a, b) => a.startMs - b.startMs)[0];

/** Mirrors the reference air-time format (bare today, date-prefixed else). */
export const airTime = (p: FixtureProgramme): string =>
  airTimeText(p.startMs, p.endMs, Date.now(), TWELVE_HOUR);

/** The Programs master lane: channels with a still-airing/upcoming match, case-insensitive name order. */
function channelsAiring(title: string): FixtureChannel[] {
  const now = Date.now();
  const ids = new Set(
    fixtureProgrammes()
      .filter((p) => p.title === title && p.endMs > now)
      .map((p) => p.channelTvgId),
  );
  return fixtureChannels()
    .filter((c) => ids.has(c.tvgId))
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.number - b.number);
}

/** One channel's still-airing/upcoming matches, chronological, repeats kept. */
function airingsOn(channel: FixtureChannel, title: string): FixtureProgramme[] {
  const now = Date.now();
  return fixtureProgrammes()
    .filter((p) => p.channelTvgId === channel.tvgId && p.title === title && p.endMs > now)
    .sort((a, b) => a.startMs - b.startMs);
}

let selectedCardName: string | null = null;
let airingsTitle = 'Newsroom Live';
const selectedChannel = (): FixtureChannel =>
  channelNamed(selectedCardName ?? channelsAiring(airingsTitle)[0]?.name ?? '');
const LATER_MARGIN_MS = 30 * 60_000;

Given('the search screen is open', async ({ world }) => {
  await expect(world.page.getByTestId('search-screen')).toBeVisible();
});

/** The quick-bar auto-hides; re-open it with MENU when the slot is not showing, then OK the slot. */
When('I press ok on the quick-bar {string} slot', async ({ world }, slot: string) => {
  // Quick-bar slots are icon buttons labelled by aria-label (the caption is a
  // sibling node); from the guide, MENU opens the row sheet whose Search row
  // carries the text. The bar auto-hides and only opens once the screen
  // handles keys, so MENU is re-sent until the slot shows (as on Android).
  const { page } = world;
  const node = page
    .locator(`[data-focus-id][aria-label="${slot}"]`)
    .or(page.locator('[data-focus-id]').filter({ has: page.getByText(slot, { exact: true }) }))
    .first();
  await expect(page.getByTestId('app-root')).toBeVisible();
  for (let attempt = 0; attempt < 8 && !(await node.isVisible()); attempt += 1) {
    await world.press('ContextMenu');
    await node.waitFor({ state: 'visible', timeout: 1500 }).catch(() => undefined);
  }
  await expect(node).toBeVisible();
  await node.evaluate((el) => (el as HTMLElement).focus());
  await expect(node).toBeFocused();
  await world.press('Enter');
  selectedCardName = null;
  await expect(page.getByTestId('search-screen')).toBeVisible();
});

Then('the voice orb is focused', async ({ world }) => {
  await expect(world.page.locator('[data-focus-id="search-orb"]')).toBeFocused();
});

Then('the query bar shows the hint {string}', async ({ world }, hint: string) => {
  await expect(world.page.getByTestId('search-query')).toHaveAttribute('placeholder', hint);
});

Then('I see the {string} header with a trash icon', async ({ world }, header: string) => {
  await expect(world.page.getByTestId('search-history')).toContainText(header);
  await expect(world.page.locator('[data-focus-id="search-trash"]')).toBeVisible();
});

Then('the empty state reads {string}', async ({ world }, text: string) => {
  await expect(world.page.getByText(text, { exact: true })).toBeVisible();
});

/** Focus + select the bar's text so "I type" REPLACES the query (the Android harness's performTextReplacement). */
When('I focus the query bar', async ({ world }) => {
  const query = world.page.getByTestId('search-query');
  await query.evaluate((el) => {
    const input = el as HTMLInputElement;
    input.focus();
    input.select();
  });
  await expect(query).toBeFocused();
});

Then(/^the "Channels" shelf lists (.+)$/, async ({ world }, rawList: string) => {
  const names = [...rawList.matchAll(/"([^"]+)"/g)].map((m) => m[1] ?? '');
  await expect(world.page.getByTestId('search-channels').getByTestId('card-name')).toHaveText(names);
});

Then('every channel card shows its logo, name, current programme and progress', async ({ world }) => {
  const now = Date.now();
  const shelf = world.page.getByTestId('search-channels');
  for (const channel of fixtureChannels().filter((c) => c.group === 'News')) {
    const card = shelf.getByTestId('channel-card').filter({ hasText: channel.name }).first();
    await expect(card.getByAltText(`${channel.name} logo`)).toBeVisible();
    await expect(card.getByTestId('card-now')).toContainText(nowProgramme(channel.tvgId, now)?.title ?? '');
    await expect(card.getByTestId('progress-bar')).toBeVisible();
  }
});

Then(
  'the {string} shelf includes channel {int} {string}',
  async ({ world }, shelf: string, _n: number, name: string) => {
    await expect(world.page.getByTestId('search-channels')).toContainText(shelf);
    await expect(
      world.page.getByTestId('search-channels').getByTestId('card-name').filter({ hasText: name }),
    ).toBeVisible();
  },
);

Then(
  'the Programs lane lists one card per channel airing {string}, in name order',
  async ({ world }, title: string) => {
    airingsTitle = title;
    const names = channelsAiring(title).map((c) => c.name);
    selectedCardName = names[0] ?? null;
    await expect(world.page.getByTestId('search-programs-lane').getByTestId('card-name')).toHaveText(names);
  },
);

Then(
  "the airings pane lists only the selected channel's {string} airings chronologically, repeats included",
  async ({ world }, title: string) => {
    airingsTitle = title;
    // Exact list equality proves chronology, repeats (when the fixture has them) and no foreign rows.
    const expected = airingsOn(selectedChannel(), title);
    expect(expected.length).toBeGreaterThanOrEqual(1);
    await expect(world.page.getByTestId('search-airings').getByTestId('airing-time')).toHaveText(
      expected.map(airTime),
    );
  },
);

Then('each airing row shows its reference air time', async ({ world }) => {
  const expected = airingsOn(selectedChannel(), airingsTitle).map(airTime);
  await expect(world.page.getByTestId('search-airings').getByTestId('airing-time')).toHaveText(expected);
});

Then("the detail card pre-renders the selected channel's first airing", async ({ world }) => {
  const first = airingsOn(selectedChannel(), airingsTitle)[0];
  if (first === undefined) throw new Error('fixtures give no airing');
  const detail = world.page.getByTestId('search-detail');
  await expect(detail).toContainText(first.title);
  await expect(detail).toContainText(airTime(first));
  await expect(detail).toContainText(first.description);
});

When('I focus the Programs channel card {string}', async ({ world }, name: string) => {
  await world.focus(name, 'search-programs-lane');
  selectedCardName = name;
});

Then('the first channel card {string} is focused', async ({ world }, name: string) => {
  const first = world.page.getByTestId('search-channels').getByTestId('channel-card').first();
  await expect(first).toBeFocused();
  await expect(first).toContainText(name);
});

Then('the first airing row of the selected channel is focused', async ({ world }) => {
  await expect(world.page.getByTestId('search-airings').getByTestId('airing-row').first()).toBeFocused();
});

When('I press ok on the Programs channel card {string}', async ({ world }, name: string) => {
  await world.select(name, 'search-programs-lane');
});

When('I press ok on the channel card {string}', async ({ world }, name: string) => {
  await world.select(name, 'search-channels');
});

/** OK on the selected channel's first airing at least ~30 min out, so a Remind set here never fires mid-scenario. */
When('I press ok on a later programme row', async ({ world }) => {
  const later = airingsOn(selectedChannel(), airingsTitle).find(
    (p) => p.startMs > Date.now() + LATER_MARGIN_MS,
  );
  if (later === undefined) throw new Error('fixtures give no later airing');
  await world.select(airTime(later), 'search-airings');
});

Then(
  'I see the dropdown rows {string}, {string}, {string}, {string}, {string}',
  async ({ world }, a: string, b: string, c: string, d: string, e: string) => {
    await expect(world.page.getByTestId('search-dropdown').locator('[data-focus-id]')).toHaveText([
      a,
      b,
      c,
      d,
      e,
    ]);
  },
);

When('I press the IME search action', async ({ world }) => {
  await expect(world.page.getByTestId('search-query')).toBeFocused();
  await world.press('Enter');
});

/** Backspace inside the text field deletes (never BACK); 20 presses clear any fixture query. */
When('I clear the query', async ({ world }) => {
  const query = world.page.getByTestId('search-query');
  await expect(query).toBeFocused();
  await world.page.keyboard.press('End');
  for (let i = 0; i < 20; i += 1) await world.page.keyboard.press('Backspace');
  await expect(query).toHaveValue('');
});

Then('the history lists {string}', async ({ world }, entry: string) => {
  await expect(
    world.page
      .getByTestId('search-history')
      .locator('[data-focus-id^="search-history-"]')
      .filter({ hasText: entry }),
  ).toBeVisible();
});

When('I press ok on the trash icon', async ({ world }) => {
  const trash = world.page.locator('[data-focus-id="search-trash"]');
  await trash.evaluate((el) => (el as HTMLElement).focus());
  await expect(trash).toBeFocused();
  await world.press('Enter');
});
