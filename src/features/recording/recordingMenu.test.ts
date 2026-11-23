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

  it('Custom recording hands the host a fresh form; Create schedules it and closes', async () => {
    const { menu, center, shown } = rig();
    menu.onCustomRecording(fakeChannel());
    const prompt = shown[0];
    if (prompt?.kind !== 'CustomForm') throw new Error('form not shown');
    const { form } = prompt;
    expect(form.channel.name).toBe('News One');
    menu.createFromForm(form);
    await vi.waitFor(() => expect(shown[1]).toEqual({ kind: 'Done' }));
    expect(center.scheduleProgramme).toHaveBeenCalledWith(form.channel, null, form.startMs, form.endMs);
  });

  it('confirmStop stops the capture and reports Done', async () => {
    const { menu, center, shown } = rig();
    menu.confirmStop(42);
    await vi.waitFor(() => expect(shown).toEqual([{ kind: 'Done' }]));
    expect(center.stop).toHaveBeenCalledWith(42);
  });
});
