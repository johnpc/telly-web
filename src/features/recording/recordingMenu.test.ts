import { describe, expect, it, vi } from 'vitest';
import type { RecordingCenter } from './recordingCenter';
import { RecordingMenu, type RecordingMenuDeps } from './recordingMenu';
import type { RecordingPrompt } from './recordingPrompt';
import { fakeChannel } from './recordingTestSupport';

function rig(): { menu: RecordingMenu; center: RecordingMenuDeps['center']; shown: RecordingPrompt[] } {
  const shown: RecordingPrompt[] = [];
  const center = {
    toggleInstant: vi.fn<RecordingCenter['toggleInstant']>().mockResolvedValue({ kind: 'Done' }),
    scheduleProgramme: vi.fn<RecordingCenter['scheduleProgramme']>().mockResolvedValue({ kind: 'Done' }),
    stop: vi.fn<RecordingCenter['stop']>().mockResolvedValue(undefined),
  };
  const menu = new RecordingMenu({ center, clock: () => 1_000_000, show: (prompt) => shown.push(prompt) });
  return { menu, center, shown };
}

describe('RecordingMenu', () => {
  it('Record toggles instant record and shows the resulting prompt', async () => {
    const { menu, center, shown } = rig();
    menu.onRecord(fakeChannel());
    await vi.waitFor(() => expect(shown).toEqual([{ kind: 'Done' }]));
    expect(center.toggleInstant).toHaveBeenCalledWith(expect.objectContaining({ name: 'News One' }));
  });

  it('Record on a future programme schedules its slot', async () => {
    const { menu, center, shown } = rig();
    menu.onRecordProgramme(fakeChannel(), 'Later', 5, 9);
    await vi.waitFor(() => expect(shown.length).toBe(1));
    expect(center.scheduleProgramme).toHaveBeenCalledWith(expect.anything(), 'Later', 5, 9);
  });

  it('Custom recording primes the form, Create schedules it and closes, BACK drops it', async () => {
    const { menu, center, shown } = rig();
    const listener = vi.fn();
    menu.subscribe(listener);
    expect(menu.form).toBeNull();
    menu.createFromForm(); // nothing open: no-op
    menu.onCustomRecording(fakeChannel());
    expect(shown).toEqual([{ kind: 'CustomForm' }]);
    const form = menu.form;
    if (form === null) throw new Error('form not primed');
    expect(form.channel.name).toBe('News One');
    menu.createFromForm();
    await vi.waitFor(() => expect(shown).toEqual([{ kind: 'CustomForm' }, { kind: 'Done' }]));
    expect(center.scheduleProgramme).toHaveBeenCalledWith(form.channel, null, form.startMs, form.endMs);
    expect(menu.form).toBeNull();
    menu.onCustomRecording(fakeChannel());
    menu.dismissForm();
    menu.dismissForm(); // idempotent
    expect(menu.form).toBeNull();
    expect(listener).toHaveBeenCalled();
  });

  it('confirmStop stops the capture and reports Done', async () => {
    const { menu, center, shown } = rig();
    menu.confirmStop(42);
    await vi.waitFor(() => expect(shown).toEqual([{ kind: 'Done' }]));
    expect(center.stop).toHaveBeenCalledWith(42);
  });
});
