import { describe, expect, it, vi } from 'vitest';
import { keyOf } from '@/core/db/channelIdentity';
import { myListKeyOf } from '@/features/mylist/myListToggle';
import { reminderKeyOf } from '@/features/reminders/guideReminders';
import { TWELVE_HOUR } from './programTimes';
import { SearchOverlays } from './searchOverlay';
import { defaultMenuHooks, menuLabel, runMenuAction } from './searchProgramMenu';
import { programHit } from './searchResults';
import { channel, program } from './searchResults.test';

const ch = channel(1, 'News One');
const hit = programHit(program('1.id', 10, 20, 'Newsroom Live'), ch, 0, TWELVE_HOUR);
const none: ReadonlySet<string> = new Set();

describe('searchProgramMenu', () => {
  it('flips the Remind and My-list labels with the live key sets', () => {
    expect(menuLabel('Remind', hit, none, none)).toBe('Remind');
    expect(menuLabel('Remind', hit, new Set([reminderKeyOf(1, 10, 'Newsroom Live')]), none)).toBe(
      'Remove reminder',
    );
    expect(menuLabel('Add to My list', hit, none, none)).toBe('Add to My list');
    expect(menuLabel('Add to My list', hit, none, new Set([myListKeyOf(keyOf(ch), 10)]))).toBe(
      'Remove from My list',
    );
    expect(menuLabel('Record', hit, none, none)).toBe('Record');
  });

  it('toggles reminders / My list and dismisses, pushes coming-soon for the rest', () => {
    const overlays = new SearchOverlays();
    const hooks = { toggleReminder: vi.fn(async () => true), toggleMyList: vi.fn(async () => true) };
    overlays.show({ kind: 'ProgramMenu', hit });
    runMenuAction('Remind', hit, overlays, hooks);
    expect(hooks.toggleReminder).toHaveBeenCalledWith(ch, hit.program);
    expect(overlays.current.kind).toBe('None');
    overlays.show({ kind: 'ProgramMenu', hit });
    runMenuAction('Add to My list', hit, overlays, hooks);
    expect(hooks.toggleMyList).toHaveBeenCalledWith(ch, hit.program);
    expect(overlays.current.kind).toBe('None');
    runMenuAction('Custom recording', hit, overlays, hooks);
    expect(overlays.current).toMatchObject({ kind: 'CustomRecording' });
    runMenuAction('Program description', hit, overlays, hooks);
    expect(overlays.current).toEqual({ kind: 'ComingSoon', feature: 'Program description' });
  });

  it('wires the default hooks to the shared stores', async () => {
    await expect(defaultMenuHooks.toggleReminder(ch, hit.program)).resolves.toBe(true);
    await expect(defaultMenuHooks.toggleReminder(ch, hit.program)).resolves.toBe(false);
    await expect(defaultMenuHooks.toggleMyList(ch, hit.program)).resolves.toBe(true);
    await expect(defaultMenuHooks.toggleMyList(ch, hit.program)).resolves.toBe(false);
  });
});
