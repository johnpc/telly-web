import { describe, expect, it, vi } from 'vitest';
import { SearchOverlays } from '@/features/search/searchOverlay';
import type { RecordingCenter } from '../recordingCenter';
import { fakeChannel } from '../recordingTestSupport';
import { createSearchRecording, onSearchPrompt, searchRecordingFor } from './searchRecording';
import { CustomRecordingForm } from '../customRecordingForm';

const program = {
  id: 1,
  channelTvgId: 'news-one.id',
  startMs: 2_000_000,
  endMs: 3_000_000,
  title: 'Later',
  subTitle: null,
  description: null,
  category: null,
  episode: null,
};

describe('search recording', () => {
  it('maps prompts onto the search overlays: the form opens, everything else closes', () => {
    const overlays = { show: vi.fn(), dismiss: vi.fn() };
    const form = new CustomRecordingForm(fakeChannel(), 1_000_000);
    onSearchPrompt({ kind: 'CustomForm', form }, overlays);
    expect(overlays.show).toHaveBeenCalledWith({ kind: 'CustomRecording', form });
    onSearchPrompt({ kind: 'Done' }, overlays);
    onSearchPrompt({ kind: 'StopConfirm', recordingId: 1, channelName: 'x' }, overlays);
    expect(overlays.dismiss).toHaveBeenCalledTimes(2);
  });

  it('Record schedules a future hit under its title and instant-records an airing one', async () => {
    const center = {
      toggleInstant: vi.fn().mockResolvedValue({ kind: 'Done' }),
      scheduleProgramme: vi.fn().mockResolvedValue({ kind: 'Done' }),
      stop: vi.fn(),
    };
    const overlays = new SearchOverlays();
    overlays.show({ kind: 'ComingSoon', feature: 'x' });
    const recording = createSearchRecording(overlays, center as unknown as RecordingCenter, () => 1_000_000);
    recording.record(fakeChannel(), program, 1_000_000);
    expect(center.scheduleProgramme).toHaveBeenCalledWith(expect.anything(), 'Later', 2_000_000, 3_000_000);
    await vi.waitFor(() => expect(overlays.current.kind).toBe('None'));
    recording.record(fakeChannel(), program, 2_500_000);
    expect(center.toggleInstant).toHaveBeenCalledTimes(1);
    recording.customRecording(fakeChannel());
    expect(overlays.current).toMatchObject({
      kind: 'CustomRecording',
      form: expect.any(CustomRecordingForm),
    });
  });

  it('keeps one adapter per overlay stack', () => {
    const a = new SearchOverlays();
    const b = new SearchOverlays();
    expect(searchRecordingFor(a)).toBe(searchRecordingFor(a));
    expect(searchRecordingFor(a)).not.toBe(searchRecordingFor(b));
  });
});
