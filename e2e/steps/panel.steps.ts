// Channel-list panel steps (port of the Android PanelSteps). Every ACTION is
// a key press; focusing a row by name is the harness's RequestFocus
// equivalent (world.focus). Assertions read the panel's data-testids:
// `channel-panel`, `panel-group-<name>`, `panel-row-<channelId>` (with
// `row-number` / `row-name` / `row-programme` / `progress-bar` / `blocked-lock`
// inside) and `panel-detail`.
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
  description: string;
}

const MS_PER_MINUTE = 60_000;
const VISIBLE_ROW_SAMPLE = 5;
let channelsCache: FixtureChannel[] | null = null;
let programmesCache: FixtureProgramme[] | null = null;

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

/** The fixture programme airing on `tvgId` at `atMs`, as the Android steps resolve it. */
async function programmeAt(page: Page, tvgId: string, atMs: number): Promise<FixtureProgramme> {
  const hit = (await fixtureProgrammes(page)).find(
    (p) => p.tvgId === tvgId && p.startMs <= atMs && atMs < p.endMs,
  );
  if (!hit) throw new Error(`fixture EPG has no programme on ${tvgId} at ${new Date(atMs).toISOString()}`);
  return hit;
}

/** "Title: Sub-title" — the row/sheet form the fixture programmes render as. */
const displayTitle = (p: FixtureProgramme): string => `${p.title}: ${p.subTitle}`;

async function channelNamed(page: Page, name: string): Promise<FixtureChannel> {
  const channel = (await fixtureChannels(page)).find((c) => c.name === name);
  if (!channel) throw new Error(`no fixture channel named ${name}`);
  return channel;
}

const panel = (page: Page): Locator => page.getByTestId('channel-panel');
const rows = (page: Page): Locator => page.locator('[data-testid^="panel-row-"]');
const rowNamed = (page: Page, name: string): Locator =>
  rows(page).filter({ has: page.getByTestId('row-name').filter({ hasText: exact(name) }) });
const focusedRow = (page: Page): Locator => page.locator('[data-testid^="panel-row-"][data-focused="true"]');
const group = (page: Page, name: string): Locator => page.getByTestId(`panel-group-${name}`);

async function focusRow(page: Page, name: string): Promise<void> {
  const row = rowNamed(page, name).first();
  await expect(row).toBeVisible();
  await row.evaluate((el) => (el as HTMLElement).focus());
  await expect(row).toBeFocused();
}

// The panel lives behind the playback overlay: OK shows the info overlay,
// DOWN expands it into the channel list (ux-spec §2.3). Idempotent when the
// panel is already up.
When('I open the channel panel', async ({ world }) => {
  const { page } = world;
  if (await panel(page).isVisible()) return;
  await expect(page.getByTestId('app-root')).toHaveAttribute('data-route', 'Playback');
  await world.press('Enter');
  await world.press('ArrowDown');
  await expect(panel(page)).toBeVisible();
});

Then(/^the groups column lists (.+)$/, async ({ world }, rawList: string) => {
  for (const name of quotedNames(rawList)) await expect(group(world.page, name)).toBeVisible();
});

Then('the groups column does not list {string}', async ({ world }, name: string) => {
  await expect(group(world.page, name)).toHaveCount(0);
});

Then('{string} is the selected group', async ({ world }, name: string) => {
  await expect(group(world.page, name)).toHaveAttribute('data-selected', 'true');
});

Then(
  'each visible channel row shows its number, logo, name and current programme with progress',
  async ({ world }) => {
    const { page } = world;
    const now = Date.now();
    for (const channel of (await fixtureChannels(page)).slice(0, VISIBLE_ROW_SAMPLE)) {
      const row = rowNamed(page, channel.name).first();
      await expect(row.getByTestId('row-number')).toHaveText(String(channel.number));
      await expect(row.getByAltText(`${channel.name} logo`)).toBeAttached();
      await expect(row.getByTestId('row-programme')).toContainText(
        displayTitle(await programmeAt(page, channel.tvgId, now)),
      );
      await expect(row.getByTestId('progress-bar')).toBeAttached();
    }
  },
);

Then('the focused row expands into a detail card with times and description', async ({ world }) => {
  const { page } = world;
  const name = await focusedRow(page).getByTestId('row-name').innerText();
  const channel = await channelNamed(page, name);
  const programme = await programmeAt(page, channel.tvgId, Date.now());
  const detail = page.getByTestId('panel-detail');
  await expect(detail).toContainText(programme.title);
  await expect(detail.getByTestId('panel-detail-times')).toHaveText(
    /\d{2}:\d{2}( [AP]M)? — \d{2}:\d{2}( [AP]M)?/,
  );
  await expect(detail.getByTestId('panel-detail-description')).toHaveText(programme.description);
});

Then('the focused channel row is number {int} {string}', async ({ world }, number: number, name: string) => {
  const row = focusedRow(world.page);
  await expect(row.getByTestId('row-name')).toHaveText(name);
  await expect(row.getByTestId('row-number')).toHaveText(String(number));
});

Then('the {string} row shows number {int}', async ({ world }, name: string, number: number) => {
  await expect(rowNamed(world.page, name).first().getByTestId('row-number')).toHaveText(String(number));
});

Then(
  'the {string} row shows the programme airing {int} minutes earlier',
  async ({ world }, name: string, minutes: number) => {
    // A +offset shifts the channel's EPG forward: the programme the panel now
    // labels "current" is the one that REALLY aired `minutes` ago.
    const { page } = world;
    const channel = await channelNamed(page, name);
    const programme = await programmeAt(page, channel.tvgId, Date.now() - minutes * MS_PER_MINUTE);
    await expect(rowNamed(page, name).first().getByTestId('row-programme')).toContainText(
      displayTitle(programme),
    );
  },
);

Then(
  'the row {string} shows the current programme of EPG id {string}',
  async ({ world }, name: string, tvgId: string) => {
    const programme = await programmeAt(world.page, tvgId, Date.now());
    await expect(rowNamed(world.page, name).first().getByTestId('row-programme')).toContainText(
      displayTitle(programme),
    );
  },
);

Then('the {string} row shows a lock indicator', async ({ world }, name: string) => {
  await expect(rowNamed(world.page, name).first().getByTestId('blocked-lock')).toBeVisible();
});

When('I focus the row {string}', async ({ world }, name: string) => focusRow(world.page, name));

When('I select the row {string}', async ({ world }, name: string) => {
  await focusRow(world.page, name);
  await world.press('Enter');
});

When('I long-press ok on the row {string}', async ({ world }, name: string) => {
  await focusRow(world.page, name);
  await world.longPressOk();
});

Then(
  'the panel is dismissed and the zap overlay announces channel {int} {string}',
  async ({ world }, number: number, name: string) => {
    const { page } = world;
    await expect(panel(page)).toHaveCount(0);
    const label = new RegExp(`^${number}\\s+${escapeRegExp(name)}`);
    const bareNumber = new RegExp(`^\\s*${number}\\s*$`);
    await expect(page.getByText(name).first()).toBeVisible();
    await expect(page.getByText(label).or(page.getByText(bareNumber)).first()).toBeVisible();
  },
);

Then(/^the channels column lists exactly (.+)$/, async ({ world }, rawList: string) => {
  const names = quotedNames(rawList);
  for (const name of names) await expect(rowNamed(world.page, name)).toHaveCount(1);
  await expect(rows(world.page)).toHaveCount(names.length);
});

Then('the channels column no longer lists {string}', async ({ world }, name: string) => {
  await expect(rowNamed(world.page, name)).toHaveCount(0);
});
