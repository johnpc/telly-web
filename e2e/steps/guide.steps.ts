// TV-guide steps (port of the Android GuideSteps + the guide-owned half of
// PanelSteps). Every ACTION is a key press; assertions read the guide's
// data-testids: `guide-screen[data-layer]`, `guide-info-*`, `guide-tick`,
// `guide-cell-menu`, `guide-row-menu`, `channel-options-pane`, `guide-groups`,
// the shared `panel-row-<id>` rows (with `row-number` / `row-name`) and the
// rail's `guide-rail-*` focusables (aria-label = the icon's name).
import type { Locator, Page } from '@playwright/test';
import { halfHourFloor } from '../../src/features/guide/guideGeometry';
import { CLOCK_12H, CLOCK_24H } from '../../src/core/time/clockStyle';
import { rangeText as range, startTimeText as timeLabel } from '../../src/core/time/programTimes';
import { Before, FIXTURE_HOST, Given, Then, When, expect } from './world';

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
  description: string;
}

let channelsCache: FixtureChannel[] | null = null;
let programmesCache: FixtureProgramme[] | null = null;
/** The time anchor guide focus keeps while navigating (0 = not yet sampled). */
let anchorMs = 0;

Before(() => {
  anchorMs = 0;
});

const unescapeXml = (s: string): string =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exact = (text: string): RegExp => new RegExp(`^${escapeRegExp(text)}$`);
const quotedNames = (raw: string): string[] => [...raw.matchAll(/"([^"]+)"/g)].map((m) => m[1] ?? '');

function xmltvMs(stamp: string): number {
  const [, y, mo, d, h, mi, s] = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(stamp) ?? [];
  return Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
}

async function fixtureChannels(page: Page): Promise<FixtureChannel[]> {
  if (channelsCache) return channelsCache;
  const text = await (await page.request.get(`${FIXTURE_HOST}/playlist.m3u`)).text();
  const out: FixtureChannel[] = [];
  for (const m of text.matchAll(/#EXTINF:[^\n]*tvg-id="([^"]+)"[^\n]*,([^\n]+)\n/g)) {
    out.push({ number: out.length + 1, tvgId: m[1] ?? '', name: (m[2] ?? '').trim() });
  }
  channelsCache = out;
  return out;
}

async function fixtureProgrammes(page: Page): Promise<FixtureProgramme[]> {
  if (programmesCache) return programmesCache;
  const xml = await (await page.request.get(`${FIXTURE_HOST}/epg.xml`)).text();
  const tag = (body: string, name: string): string =>
    unescapeXml(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(body)?.[1] ?? '');
  const out: FixtureProgramme[] = [];
  for (const m of xml.matchAll(
    /<programme start="([^"]+)" stop="([^"]+)" channel="([^"]+)">([\s\S]*?)<\/programme>/g,
  )) {
    const body = m[4] ?? '';
    out.push({
      tvgId: m[3] ?? '',
      startMs: xmltvMs(m[1] ?? ''),
      endMs: xmltvMs(m[2] ?? ''),
      title: tag(body, 'title'),
      subTitle: tag(body, 'sub-title'),
      description: tag(body, 'desc'),
    });
  }
  programmesCache = out;
  return out;
}

async function channelNumbered(page: Page, number: number): Promise<FixtureChannel> {
  const channel = (await fixtureChannels(page))[number - 1];
  if (!channel) throw new Error(`no fixture channel number ${number}`);
  return channel;
}

async function channelNamed(page: Page, name: string): Promise<FixtureChannel> {
  const channel = (await fixtureChannels(page)).find((c) => c.name === name);
  if (!channel) throw new Error(`no fixture channel named ${name}`);
  return channel;
}

/** The fixture programme airing on `tvgId` at `atMs`. */
async function programmeAt(page: Page, tvgId: string, atMs: number): Promise<FixtureProgramme> {
  const hit = (await fixtureProgrammes(page)).find(
    (p) => p.tvgId === tvgId && p.startMs <= atMs && atMs < p.endMs,
  );
  if (!hit) throw new Error(`fixture EPG has no programme on ${tvgId} at ${new Date(atMs).toISOString()}`);
  return hit;
}

/** The programme after the one airing at `atMs`. */
async function programmeAfter(page: Page, tvgId: string, atMs: number): Promise<FixtureProgramme> {
  const now = await programmeAt(page, tvgId, atMs);
  return programmeAt(page, tvgId, now.endMs);
}

/** "Title: Sub-title" — the start of the display title the cells and info pane render. */
const displayTitle = (p: FixtureProgramme): string => `${p.title}: ${p.subTitle}`;
/** Either clock format's range text (the 24-hour scenario never asserts a range). */
const rangeText = (p: FixtureProgramme): RegExp =>
  new RegExp(
    `^(${escapeRegExp(range(p.startMs, p.endMs, CLOCK_12H))}|${escapeRegExp(range(p.startMs, p.endMs, CLOCK_24H))})$`,
  );

function anchorOrNow(): number {
  if (anchorMs === 0) anchorMs = Date.now();
  return anchorMs;
}

const guide = (page: Page): Locator => page.getByTestId('guide-screen');
const ticks = (page: Page): Locator => page.getByTestId('guide-tick');
const infoRange = (page: Page): Locator => page.getByTestId('guide-info-range');
const rows = (page: Page): Locator => page.locator('[data-guide-row]');
const rowNamed = (page: Page, name: string): Locator =>
  rows(page).filter({ has: page.getByTestId('row-name').filter({ hasText: exact(name) }) });

async function rightOfCentre(locator: Locator, page: Page): Promise<void> {
  const centre = (page.viewportSize()?.width ?? 1920) / 2;
  await expect(locator).toBeVisible();
  await expect.poll(async () => (await locator.boundingBox())?.x ?? 0).toBeGreaterThan(centre);
}

async function gridOpen(page: Page): Promise<void> {
  await expect(guide(page)).toBeVisible();
  await expect(ticks(page).first()).toBeVisible();
  await expect(page.getByText('News One', { exact: true }).first()).toBeVisible();
}

// ---- arranged state (settings written through the test hook, like the Android store writes) ----

Given('confirm exit on second BACK is enabled', async ({ world }) => {
  await world.page.evaluate(() => window.telly.setSetting('general_confirm_exit', 'true'));
});

Given('the clock format is {string}', async ({ world }, raw: string) => {
  await world.page.evaluate((value) => window.telly.setSetting('appearance_clock_format', value), raw);
});

// ---- the grid ----

Then('the TV guide opens with the programme grid', async ({ world }) => gridOpen(world.page));

Then(
  'I see the preview window playing channel {int} {string}',
  async ({ world }, number: number, name: string) => {
    const { page } = world;
    await gridOpen(page);
    await expect(page.getByTestId('guide-preview').getByTestId('video-surface-host')).toBeAttached();
    const row = rowNamed(page, name).first();
    await expect(row).toHaveAttribute('data-playing', 'true');
    await expect(row.getByTestId('row-number')).toHaveText(String(number));
  },
);

Then('the info pane shows the focused programme title, time range and description', async ({ world }) => {
  const { page } = world;
  const channel = await channelNumbered(page, 1);
  anchorMs = Date.now();
  const programme = await programmeAt(page, channel.tvgId, anchorMs);
  await expect(page.getByTestId('guide-info-title')).toContainText(displayTitle(programme));
  await expect(infoRange(page)).toHaveText(rangeText(programme));
  await expect(page.getByTestId('guide-info')).toContainText(programme.description);
});

Then(
  'the channel column lists number, logo and name for {string} and {string}',
  async ({ world }, first: string, second: string) => {
    const { page } = world;
    for (const name of [first, second]) {
      const channel = await channelNamed(page, name);
      const row = rowNamed(page, name).first();
      await expect(row.getByTestId('row-number')).toHaveText(String(channel.number));
      await expect(row.getByAltText(`${name} logo`)).toBeAttached();
    }
  },
);

Then('the grid shows the current and next programme cells of {string}', async ({ world }, name: string) => {
  const { page } = world;
  const channel = await channelNamed(page, name);
  const now = Date.now();
  const cells = rowNamed(page, name).first().getByTestId('guide-cell');
  await expect(
    cells.filter({ hasText: displayTitle(await programmeAt(page, channel.tvgId, now)) }),
  ).toHaveCount(1);
  await expect(
    cells.filter({ hasText: displayTitle(await programmeAfter(page, channel.tvgId, now)) }),
  ).toHaveCount(1);
});

Then('channels without EPG show {string} cells', async ({ world }, placeholder: string) => {
  await expect(world.page.getByTestId('guide-cell').filter({ hasText: placeholder }).first()).toBeVisible();
});

Then(
  'the guide row of {string} shows the current programme of EPG id {string}',
  async ({ world }, name: string, tvgId: string) => {
    const programme = await programmeAt(world.page, tvgId, Date.now());
    await expect(rowNamed(world.page, name).first()).toContainText(programme.title);
  },
);

Then("the header clock shows today's date and time", async ({ world }) => {
  const today = new Date();
  const date = `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][today.getDay()]}, ${
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][today.getMonth()]
  } ${today.getDate()}`;
  await expect(world.page.getByTestId('guide-clock')).toHaveText(
    new RegExp(`^${escapeRegExp(date)}, \\d{1,2}:\\d{2} [AP]M$`),
  );
});

Then("the header clock shows today's date and a 24-hour time", async ({ world }) => {
  await expect(world.page.getByTestId('guide-clock')).toHaveText(/^\w{3}, \w{3} \d{1,2}, \d{2}:\d{2}$/);
});

Then('the timeline shows labels every 30 minutes', async ({ world }) => {
  await expect
    .poll(
      async () =>
        (await ticks(world.page).allTextContents()).filter((t) => /^\d{2}:(00|30) [AP]M$/.test(t)).length,
    )
    .toBeGreaterThanOrEqual(2);
});

Then('the timeline shows 24-hour labels every 30 minutes', async ({ world }) => {
  await expect
    .poll(
      async () => (await ticks(world.page).allTextContents()).filter((t) => /^\d{2}:(00|30)$/.test(t)).length,
    )
    .toBeGreaterThanOrEqual(2);
});

Then('the now-line marks the current time in the grid', async ({ world }) => {
  await expect(world.page.getByTestId('now-line')).toBeVisible();
});

Then('the next programme cell of channel {int} is focused', async ({ world }, number: number) => {
  const { page } = world;
  const channel = await channelNumbered(page, number);
  const next = await programmeAfter(page, channel.tvgId, Date.now());
  await expect(infoRange(page)).toHaveText(rangeText(next));
  anchorMs = next.startMs;
});

Then("the info pane shows that programme's title", async ({ world }) => {
  const { page } = world;
  const channel = await channelNumbered(page, 1);
  const programme = await programmeAt(page, channel.tvgId, anchorOrNow());
  await expect(page.getByTestId('guide-info-title')).toContainText(displayTitle(programme));
});

Then('the focused cell is on channel {int} at roughly the same time', async ({ world }, number: number) => {
  const { page } = world;
  const channel = await channelNumbered(page, number);
  const programme = await programmeAt(page, channel.tvgId, anchorOrNow());
  await expect(infoRange(page)).toHaveText(rangeText(programme));
  await expect(rowNamed(page, channel.name).first()).toHaveAttribute('data-focused-row', 'true');
});

Then('the timeline header has scrolled forward with the cells', async ({ world }) => {
  const originLabel = timeLabel(halfHourFloor(Date.now()), CLOCK_12H);
  await expect(ticks(world.page).first()).toBeVisible();
  await expect(ticks(world.page).filter({ hasText: exact(originLabel) })).toHaveCount(0);
});

When('I press ok on the airing programme', async ({ world }) => {
  // Only airing cells put the remaining-minutes pill in the info pane.
  await expect(world.page.getByTestId('guide-info-remaining')).toHaveText(/\d+ min/);
  await world.press('Enter');
});

// ---- layers ----

Then(/^a dropdown anchored under the cell lists exactly (.+)$/, async ({ world }, rawList: string) => {
  await expect(world.page.getByTestId('guide-cell-menu').locator('li')).toHaveText(quotedNames(rawList));
});

Then('the programme grid is focused again', async ({ world }) => {
  const { page } = world;
  await expect(guide(page)).toHaveAttribute('data-layer', 'Grid');
  await expect(page.getByTestId('coming-soon')).toHaveCount(0);
  await expect(page.getByTestId('channel-menu')).toHaveCount(0);
  await expect(ticks(page).first()).toBeVisible();
});

Then('a right-side sheet opens with the guide grid still visible behind it', async ({ world }) => {
  const { page } = world;
  await rightOfCentre(page.getByTestId('channel-menu'), page);
  await expect(page.getByTestId('channel-menu').getByText('Channel options')).toBeVisible();
  await expect(ticks(page).first()).toBeVisible();
});

Then(/^I see a blue programme section with (.+)$/, async ({ world }, rawList: string) => {
  // From the guide the sheet belongs to the focused row (the tuned channel at open).
  const { page } = world;
  const channel = await channelNumbered(page, 1);
  const programme = await programmeAt(page, channel.tvgId, Date.now());
  const sheet = page.getByTestId('channel-menu');
  await expect(sheet.getByText(displayTitle(programme), { exact: false })).toBeVisible();
  for (const name of quotedNames(rawList)) await expect(sheet.getByText(name, { exact: true })).toBeVisible();
});

Then(/^I see a blue "([^"]+)" section with (.+)$/, async ({ world }, header: string, rawList: string) => {
  const sheet = world.page.getByTestId('channel-menu');
  await expect(sheet.getByText(header, { exact: true }).first()).toBeVisible();
  for (const name of quotedNames(rawList)) await expect(sheet.getByText(name, { exact: true })).toBeVisible();
});

Then('the channel column no longer lists {string}', async ({ world }, name: string) => {
  await expect(rowNamed(world.page, name)).toHaveCount(0);
});

Then("the description layer shows the focused programme's title and synopsis", async ({ world }) => {
  const { page } = world;
  const channel = await channelNumbered(page, 1);
  const programme = await programmeAt(page, channel.tvgId, Date.now());
  const layer = page.getByTestId('guide-description');
  await expect(layer).toContainText(displayTitle(programme));
  await expect(layer).toContainText(programme.description);
});

Then('a right pane titled {string} opens', async ({ world }, title: string) => {
  const { page } = world;
  const heading = page
    .getByTestId('channel-options-pane')
    .locator('h2')
    .filter({ hasText: exact(title) });
  await rightOfCentre(heading, page);
});

Then(/^the pane lists the rows (.+)$/, async ({ world }, rawList: string) => {
  const pane = world.page.getByTestId('channel-options-pane');
  for (const title of quotedNames(rawList))
    await expect(pane.getByText(title, { exact: true })).toBeVisible();
});

When('I select {string} in the tool sheet', async ({ world }, text: string) =>
  world.select(text, 'group-tool'),
);

// ---- groups column, rail, exit ----

Then('the groups column is dismissed', async ({ world }) => {
  await expect(world.page.getByTestId('guide-groups')).toHaveCount(0);
});

Then('the {string} rail icon has focus', async ({ world }, label: string) => {
  await expect(world.page.locator(`[data-focus-id^="guide-rail-"][aria-label="${label}"]`)).toHaveAttribute(
    'data-focused',
    'true',
  );
});

Then('focus returns to the groups column', async ({ world }) => {
  await expect(world.page.locator('[data-focus-id^="guide-group-"][data-focused="true"]')).toBeVisible();
});

Then('telly exits to the launcher', async ({ world }) => {
  await expect(world.page.getByTestId('exited-screen')).toBeVisible();
});

Then('telly is still running', async ({ world }) => {
  await expect(world.page.getByTestId('exited-screen')).toHaveCount(0);
  await expect(guide(world.page)).toBeVisible();
});
