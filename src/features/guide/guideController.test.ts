import { describe, expect, it } from 'vitest';
import { TellySettings } from '@/core/settings/tellySettings';
import { catchupSession } from '@/features/catchup';
import { LAST_CHANNEL_KEY } from '@/features/playback/tune';
import { activateFocused } from './guideControllerFlows';
import { GRID, GROUPS } from './guideLayer';
import type { GuideRow } from './guideModel';
import { ALL_CHANNELS } from './guideRowsBuilder';
import { HOUR, ORIGIN, cell, row } from './testFixtures';
import { makeHarness } from './testHarness';

async function rowsOf(harness: Awaited<ReturnType<typeof makeHarness>>): Promise<GuideRow[]> {
  return (await harness.channels.visible()).map((c, i) => row(c, ORIGIN, 4, i + 1));
}

describe('GuideController', () => {
  it('resolves focus from rows, routes keys through the policy and notifies', async () => {
    const harness = await makeHarness({ tunesPreview: false });
    const { controller } = harness;
    let changes = 0;
    controller.subscribe(() => (changes += 1));
    controller.setRows(await rowsOf(harness));
    expect(controller.engine.focus?.rowIndex).toBe(0);
    expect(controller.onKey('DOWN')).toBe(true);
    expect(controller.engine.focus?.rowIndex).toBe(1);
    expect(controller.focusedRow()?.channel.name).toBe('News Two');
    expect(controller.onKey('CHANNEL_UP')).toBe(false);
    harness.deps.settings.set(TellySettings.REMOTE_GUIDE_CHANNEL_UP_DOWN, 'Page the channel list');
    expect(controller.onKey('CHANNEL_DOWN')).toBe(true);
    expect(controller.onKey('LONG_LEFT')).toBe(true);
    expect(controller.engine.scrollX).toBeLessThan(0);
    expect(controller.onKey('BACK')).toBe(true);
    expect(controller.layer).toEqual(GROUPS);
    expect(controller.onKey('RIGHT')).toBe(true);
    expect(controller.layer).toEqual(GRID);
    controller.setNow(ORIGIN + 5);
    expect(controller.now).toBe(ORIGIN + 5);
    expect(changes).toBeGreaterThan(3);
    controller.dispose();
  });
  it('seeds focus on the last-tuned row exactly once when the preview resumes', async () => {
    const harness = await makeHarness();
    const { controller } = harness;
    const rows = await rowsOf(harness);
    harness.deps.store.set(LAST_CHANNEL_KEY, String(rows[2]?.channel.id));
    controller.setRows([]);
    controller.setRows(rows);
    expect(controller.engine.focus?.rowIndex).toBe(2);
    controller.engine.reset();
    controller.setRows(rows);
    expect(controller.engine.focus?.rowIndex).toBe(0);
    const untuned = await makeHarness({ tunesPreview: false });
    untuned.deps.store.set(LAST_CHANNEL_KEY, String(rows[2]?.channel.id));
    untuned.controller.setRows(await rowsOf(untuned));
    expect(untuned.controller.engine.focus?.rowIndex).toBe(0);
  });
  it('selects groups, resetting focus, and gates parental-locked groups behind the PIN', async () => {
    const harness = await makeHarness();
    const { controller, deps } = harness;
    controller.setRows(await rowsOf(harness));
    controller.onKey('BACK');
    controller.selectGroup('Sports');
    expect(controller.selectedGroup).toBe('Sports');
    expect(controller.engine.focus).toBeNull();
    expect(controller.layer).toEqual(GRID);
    controller.selectGroup('Sports');
    deps.settings.set(TellySettings.PARENTAL_ENABLED, true);
    deps.parental.setGroupLocked('Movies', true);
    controller.selectGroup('Movies');
    expect(controller.layer).toEqual({ kind: 'GroupPin', group: 'Movies' });
    expect(controller.selectedGroup).toBe('Sports');
    expect(controller.customGroups).toEqual([]);
    controller.setCustomGroups([{ id: 1, name: 'X', members: new Set() }]);
    expect(controller.customGroups).toHaveLength(1);
    expect(ALL_CHANNELS).toBe('All channels');
  });
  it('OK tunes the focused channel and jumps to fullscreen; a playable past cell plays its archive', async () => {
    const harness = await makeHarness();
    const { controller, engine, fullscreen } = harness;
    const rows = await rowsOf(harness);
    controller.setRows(rows);
    activateFocused(controller, harness.deps);
    expect(engine.load).toHaveBeenCalledWith(rows[0]?.channel.streamUrl, { live: true });
    expect(fullscreen).toHaveBeenCalledTimes(1);
    expect(harness.deps.tuner.current?.id).toBe(rows[0]?.channel.id);
    const catchup = {
      ...(rows[0] as GuideRow),
      channel: { ...(rows[0] as GuideRow).channel, catchupType: 'shift', catchupDays: 2 },
    };
    const past = cell(ORIGIN - 2 * HOUR, ORIGIN - HOUR);
    controller.setRows([{ ...catchup, cells: [past, ...catchup.cells] }]);
    controller.engine.apply({
      focus: { rowIndex: 0, cell: past, anchorMs: past.startMs },
      scrollX: 0,
      firstRow: 0,
    });
    activateFocused(controller, harness.deps);
    // The archive is parked for the playback screen; the preview keeps the live stream.
    expect(catchupSession.consume()?.url).toContain('utc=');
    expect(engine.load).toHaveBeenCalledTimes(1);
    controller.engine.reset();
    activateFocused(controller, harness.deps);
    expect(fullscreen).toHaveBeenCalledTimes(2);
    harness.deps.open({ kind: 'Search' });
    expect(harness.opened).toEqual([{ kind: 'Search' }]);
  });
});
