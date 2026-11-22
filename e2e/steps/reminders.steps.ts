// Steps for programme reminders (guide dropdown + settings pane).
import { Then, When, expect } from './world';
import { type FixtureProgramme, fixtureChannels, fixtureProgrammes, nowProgramme } from './search.steps';
import { clockText } from '../../src/core/time/programTimes';

/** The future programme the scenario set its reminder on. */
let remembered: FixtureProgramme | null = null;

/** The programme `skip` future cells right of the airing one. */
function futureProgramme(channelNumber: number, skip: number): FixtureProgramme {
  const channel = fixtureChannels()[channelNumber - 1];
  if (channel === undefined) throw new Error(`no fixture channel ${channelNumber}`);
  const now = Date.now();
  const programme = fixtureProgrammes()
    .filter((p) => p.channelTvgId === channel.tvgId && p.startMs > now)
    .sort((a, b) => a.startMs - b.startMs)[skip - 1];
  if (programme === undefined) throw new Error('fixtures give no later programme');
  return programme;
}

/**
 * Two RIGHTs from the airing cell land on a programme at least ~30 min out, so
 * the reminder can never fire (default 5-min lead) mid-scenario; long-OK there
 * opens the cell dropdown ("Record" is label-stable; Remind relabels with state).
 */
When('I open the dropdown on a later programme of channel {int}', async ({ world }, number: number) => {
  remembered = futureProgramme(number, 2);
  // The grid loads asynchronously: wait for the airing cell's title in the
  // info pane before moving, then for the later programme's title (the pane
  // follows the focused cell) before opening its dropdown — a Remind set on
  // the AIRING cell would be due at once and pop the reminder mid-scenario.
  const channel = fixtureChannels()[number - 1];
  const airing = channel === undefined ? undefined : nowProgramme(channel.tvgId, Date.now());
  if (airing !== undefined) await world.seeText(airing.title);
  await world.press('ArrowRight', 2);
  await world.seeText(remembered.title);
  await world.longPressOk();
  await world.seeText('Record');
});

Then(
  'the reminders pane lists the remembered programme on {string}',
  async ({ world }, channelName: string) => {
    if (remembered === null) throw new Error('no reminder was set in this scenario');
    await world.seeText(remembered.title);
    await world.seeText(channelName);
    await world.seeText(clockText(remembered.startMs));
  },
);

When('I activate the remembered reminder', async ({ world }) => {
  if (remembered === null) throw new Error('no reminder was set in this scenario');
  await world.select(remembered.title);
});

Then('the reminder popup shows {string}', async ({ world }, title: string) => {
  await expect(world.page.getByTestId('reminder-popup')).toContainText(title);
});
