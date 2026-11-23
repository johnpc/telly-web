import { describe, expect, it, vi } from 'vitest';
import type { GuideLayer } from '@/features/guide/guideLayer';
import type { GuideCell } from '@/features/guide/guideModel';
import type { RecordingCenter } from '../recordingCenter';
import { fakeChannel } from '../recordingTestSupport';
import { createGuideRecording, layerFor } from './guideRecording';

const ROW_MENU: GuideLayer = { kind: 'RowMenu' };
const GRID: GuideLayer = { kind: 'Grid' };

describe('guide recording prompts', () => {
  it('maps every prompt onto a guide layer', () => {
    expect(layerFor({ kind: 'Done' }, ROW_MENU)).toEqual(GRID);
    expect(layerFor({ kind: 'StopConfirm', recordingId: 2, channelName: 'News One' }, ROW_MENU)).toEqual({
      kind: 'RecordingStop',
      recordingId: 2,
      channelName: 'News One',
      back: GRID,
    });
    expect(layerFor({ kind: 'CustomForm' }, ROW_MENU)).toEqual({ kind: 'CustomRecording', back: ROW_MENU });
  });
});

describe('createGuideRecording', () => {
  function rig(): {
    shown: GuideLayer[];
    center: {
      toggleInstant: ReturnType<typeof vi.fn>;
      scheduleProgramme: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    };
    recording: ReturnType<typeof createGuideRecording>;
  } {
    const shown: GuideLayer[] = [];
    const center = {
      toggleInstant: vi.fn().mockResolvedValue({ kind: 'Done' }),
      scheduleProgramme: vi.fn().mockResolvedValue({ kind: 'Done' }),
      stop: vi.fn().mockResolvedValue(undefined),
    };
    const recording = createGuideRecording({
      show: (layer) => void shown.push(layer),
      layer: () => ROW_MENU,
      center: center as unknown as RecordingCenter,
      clock: () => 1_000_000,
    });
    return { shown, center, recording };
  }

  it('the sheet row instant-records and lands back on the grid', async () => {
    const { shown, center, recording } = rig();
    recording.record(fakeChannel());
    await vi.waitFor(() => expect(shown).toEqual([GRID]));
    expect(center.toggleInstant).toHaveBeenCalledTimes(1);
  });

  it('the cell dropdown instant-records an airing cell and schedules a future one under its title', async () => {
    const { center, recording } = rig();
    const program = {
      id: 1,
      channelTvgId: 'news-one.id',
      startMs: 2_000_000,
      endMs: 3_000_000,
      title: 'Later',
      subTitle: 'Part 2',
      description: null,
      category: null,
      episode: null,
    };
    const future: GuideCell = { startMs: 2_000_000, endMs: 3_000_000, program };
    recording.recordCell(fakeChannel(), future, 1_000_000);
    expect(center.scheduleProgramme).toHaveBeenCalledWith(
      expect.anything(),
      'Later: Part 2',
      2_000_000,
      3_000_000,
    );
    const filler: GuideCell = { startMs: 2_000_000, endMs: 3_000_000, program: null };
    recording.recordCell(fakeChannel(), filler, 1_000_000);
    expect(center.scheduleProgramme).toHaveBeenLastCalledWith(expect.anything(), null, 2_000_000, 3_000_000);
    recording.recordCell(fakeChannel(), future, 2_500_000);
    await vi.waitFor(() => expect(center.toggleInstant).toHaveBeenCalledTimes(1));
  });

  it('custom recording primes the form; the Stop confirm stops the capture', async () => {
    const { shown, center, recording } = rig();
    recording.customRecording(fakeChannel());
    expect(shown).toEqual([{ kind: 'CustomRecording', back: ROW_MENU }]);
    expect(recording.menu.form).not.toBeNull();
    recording.confirmStop(5);
    await vi.waitFor(() => expect(center.stop).toHaveBeenCalledWith(5));
    expect(shown[1]).toEqual(GRID);
  });
});
