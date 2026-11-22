// Steps for the corrected History model (history-round2): the info overlay's
// recent-channel cards + Clear, and the full-screen History list. Reads
// `recent-card`, `recent-card-line`, `history-screen`, `history-row`,
// `history-clear`.
import type { Locator, Page } from '@playwright/test';
import { FIXTURE_HOST, Then, When, expect } from './world';

interface FixtureProgramme {
  tvgId: string;
  startMs: number;
  endMs: number;
  title: string;
  subTitle: string;
}

let channelIds: Map<string, string> | null = null;
let programmes: FixtureProgramme[] | null = null;

function xmltvMs(stamp: string): number {
  const [, y, mo, d, h, mi, s] = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(stamp) ?? [];
  return Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
}

/** The fixture programme airing NOW on the channel called `name`, in its "Title: Sub-title" display form. */
async function nowProgrammeOf(page: Page, name: string): Promise<string> {
  if (channelIds === null) {
    const m3u = await (await page.request.get(`${FIXTURE_HOST}/playlist.m3u`)).text();
    channelIds = new Map(
      [...m3u.matchAll(/#EXTINF:[^\n]*tvg-id="([^"]+)"[^\n]*,([^\n]+)\n/g)].map((m) => [
        (m[2] ?? '').trim(),
        m[1] ?? '',
      ]),
    );
  }
  if (programmes === null) {
    const xml = await (await page.request.get(`${FIXTURE_HOST}/epg.xml`)).text();
    const tag = (body: string, tagName: string): string =>
      new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`).exec(body)?.[1]?.replace(/&amp;/g, '&') ?? '';
    programmes = [
      ...xml.matchAll(/<programme start="([^"]+)" stop="([^"]+)" channel="([^"]+)">([\s\S]*?)<\/programme>/g),
    ].map((m) => ({
      tvgId: m[3] ?? '',
      startMs: xmltvMs(m[1] ?? ''),
      endMs: xmltvMs(m[2] ?? ''),
      title: tag(m[4] ?? '', 'title'),
      subTitle: tag(m[4] ?? '', 'sub-title'),
    }));
  }
  const tvgId = channelIds.get(name);
  const now = Date.now();
  const hit = programmes.find((p) => p.tvgId === tvgId && p.startMs <= now && now < p.endMs);
  if (hit === undefined) throw new Error(`fixture EPG has no programme airing on ${name}`);
  return `${hit.title}: ${hit.subTitle}`;
}

const recentCards = (page: Page): Locator => page.getByTestId('recent-card');
const historyRows = (page: Page): Locator => page.getByTestId('history-row');
const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rowNamed = (page: Page, name: string): Locator =>
  historyRows(page).filter({
    has: page.getByTestId('history-row-name').filter({ hasText: new RegExp(`^${escapeRegExp(name)}$`) }),
  });
const quotedNames = (raw: string): string[] => [...raw.matchAll(/"([^"]+)"/g)].map((m) => m[1] ?? '');

async function focusNode(node: Locator): Promise<void> {
  await expect(node).toBeVisible();
  await node.evaluate((el) => (el as HTMLElement).focus());
  await expect(node).toBeFocused();
}

Then('I see the {string} card', async ({ world }, label: string) => {
  await expect(world.page.getByTestId('cards-row').getByText(label, { exact: true })).toBeVisible();
});

Then(
  'I see {int} recent-channel cards with the current programmes of {string} and {string}',
  async ({ world }, count: number, first: string, second: string) => {
    const { page } = world;
    await expect(recentCards(page)).toHaveCount(count);
    for (const name of [first, second]) {
      await expect(recentCards(page).filter({ hasText: await nowProgrammeOf(page, name) })).toHaveCount(1);
    }
  },
);

When('I focus the first recent-channel card', async ({ world }) =>
  focusNode(recentCards(world.page).first()),
);

When('I select the first recent-channel card', async ({ world }) => {
  await focusNode(recentCards(world.page).first());
  await world.press('Enter');
});

Then('the focused recent card shows the air time of {string}', async ({ world }, name: string) => {
  const line = world.page.getByTestId('recent-card-line');
  await expect(line).toHaveText(/^\d{2}:\d{2}( [AP]M)? — \d{2}:\d{2}( [AP]M)? {3}\S/);
  await expect(line).toContainText(await nowProgrammeOf(world.page, name));
});

Then('no recent-channel cards are visible', async ({ world }) => {
  await expect(recentCards(world.page)).toHaveCount(0);
});

Then('the History screen opens', async ({ world }) => {
  await expect(world.page.getByTestId('history-screen')).toBeVisible();
  await expect(world.page.getByTestId('history-clear')).toBeVisible();
});

Then(/^the History screen lists exactly (.+)$/, async ({ world }, rawList: string) => {
  const { page } = world;
  const names = quotedNames(rawList);
  await expect(historyRows(page)).toHaveCount(names.length);
  for (const [index, name] of names.entries()) {
    await expect(historyRows(page).nth(index).getByTestId('history-row-name')).toHaveText(name);
  }
});

When('I select the History row {string}', async ({ world }, name: string) => {
  await focusNode(rowNamed(world.page, name).first());
  await world.press('Enter');
});

When('I select the History clear-all icon', async ({ world }) => {
  await focusNode(world.page.getByTestId('history-clear'));
  await world.press('Enter');
});
