import { describe, expect, it, vi } from 'vitest';
import { NO_TRACKS, type TrackSnapshot } from '@/core/player';
import { quickBarItems, QUICK_BAR_ACTIONS } from '../quickbar/quickBar';
import { TrackLabels } from './trackLabels';
import { PICKER_TITLES, pickerKindOf } from './trackPickerKind';
import { applyPickerRow, AUTO, CURRENT, OFF, pickerRows, SYNC_LIMIT_MS } from './trackPickerRows';

const details = { width: 1280, height: 720, frameRate: 25, audioChannels: 1 };
const hls: TrackSnapshot = {
  videos: [
    { id: 'level:0', width: 1920, height: 1080, bitrate: 5_200_000 },
    { id: 'level:1', width: 0, height: 0, bitrate: 0 },
  ],
  audios: [
    { id: 'audio:0', language: 'en', channels: 2 },
    { id: 'audio:1', language: 'und', channels: 0 },
  ],
  texts: [{ id: 'text:0', language: 'fr' }],
  videoOverrideId: 'level:0',
  selectedAudioId: 'audio:1',
  selectedTextId: 'text:0',
};

describe('TrackLabels', () => {
  it('labels renditions, tracks, sync offsets and quick-bar slots', () => {
    expect(TrackLabels.video({ id: 'v', width: 1920, height: 1080, bitrate: 5_200_000 })).toBe(
      '1920×1080, 5.2 Mbps',
    );
    expect(TrackLabels.video({ id: 'v', width: 1280, height: 720, bitrate: 0 })).toBe('1280×720');
    expect(TrackLabels.video({ id: 'v', width: 0, height: 0, bitrate: 1 })).toBe('Video');
    expect(TrackLabels.audio({ id: 'a', language: 'en', channels: 2 }, 0)).toBe('English · Stereo');
    expect(TrackLabels.audio({ id: 'a', language: null, channels: 1 }, 1)).toBe('Audio 2 · Mono');
    expect(TrackLabels.audio({ id: 'a', language: 'und', channels: 6 }, 0)).toBe('Audio 1 · Surround');
    expect(TrackLabels.audio({ id: 'a', language: ' ', channels: 0 }, 0)).toBe('Audio 1');
    expect(TrackLabels.text({ id: 't', language: 'fr' }, 0)).toBe('French');
    expect(TrackLabels.text({ id: 't', language: null }, 2)).toBe('Subtitles 3');
    expect(TrackLabels.sync(0)).toBe('0 ms');
    expect(TrackLabels.sync(75)).toBe('+75 ms');
    expect(TrackLabels.sync(-25)).toBe('-25 ms');
    expect(TrackLabels.subtitleSlot(NO_TRACKS)).toBe('Off');
    expect(TrackLabels.subtitleSlot(hls)).toBe('French');
    expect(TrackLabels.resolutionSlot(details)).toBe('1280 × 720');
    expect(TrackLabels.resolutionSlot(null)).toBe('—');
    expect(TrackLabels.audioSlot(details)).toBe('Mono');
    expect(TrackLabels.audioSlot({ ...details, audioChannels: 2 })).toBe('Stereo');
    expect(TrackLabels.audioSlot({ ...details, audioChannels: 0 })).toBe('—');
  });
});

describe('pickerRows', () => {
  it('synthesizes the playing rendition when the container exposes no tracks', () => {
    const source = { tracks: NO_TRACKS, details, audioSyncMs: 0 };
    expect(pickerRows('Video', source)).toEqual([
      { id: AUTO, label: 'Auto', checked: true },
      { id: CURRENT, label: '1280×720', checked: false },
    ]);
    expect(pickerRows('Audio', source)).toEqual([{ id: CURRENT, label: 'Audio 1 · Mono', checked: true }]);
    expect(pickerRows('Subtitles', source)).toEqual([{ id: OFF, label: 'Off', checked: true }]);
    expect(pickerRows('Sync', source).map((r) => r.label)).toEqual([
      '-50 ms',
      '-25 ms',
      '+25 ms',
      '+50 ms',
      'Reset',
    ]);
    const unknown = { tracks: NO_TRACKS, details: null, audioSyncMs: 0 };
    expect(pickerRows('Video', unknown)).toHaveLength(1);
    expect(pickerRows('Audio', unknown)).toEqual([]);
  });

  it('lists real tracks with the active one checked', () => {
    const source = { tracks: hls, details, audioSyncMs: 0 };
    expect(pickerRows('Video', source).map((r) => [r.label, r.checked])).toEqual([
      ['Auto', false],
      ['1920×1080, 5.2 Mbps', true],
      ['Video', false],
    ]);
    expect(pickerRows('Audio', source).map((r) => r.checked)).toEqual([false, true]);
    expect(pickerRows('Subtitles', source).map((r) => r.checked)).toEqual([false, true]);
  });

  it('applies rows to the engine; the sync stepper clamps and keeps the dialog open', () => {
    const engine = {
      selectVideoTrack: vi.fn(),
      selectAudioTrack: vi.fn(),
      selectTextTrack: vi.fn(),
      audioSyncMs: 0,
    };
    expect(applyPickerRow('Video', AUTO, engine)).toBe(true);
    applyPickerRow('Video', 'level:1', engine);
    applyPickerRow('Video', CURRENT, engine);
    expect(engine.selectVideoTrack.mock.calls).toEqual([[null], ['level:1'], [null]]);
    expect(applyPickerRow('Audio', 'audio:0', engine)).toBe(true);
    applyPickerRow('Audio', CURRENT, engine);
    expect(engine.selectAudioTrack).toHaveBeenCalledTimes(1);
    expect(applyPickerRow('Subtitles', OFF, engine)).toBe(true);
    applyPickerRow('Subtitles', 'text:0', engine);
    expect(engine.selectTextTrack.mock.calls).toEqual([[null], ['text:0']]);
    expect(applyPickerRow('Sync', 'sync:50', engine)).toBe(false);
    applyPickerRow('Sync', 'sync:25', engine);
    expect(engine.audioSyncMs).toBe(75);
    for (let i = 0; i < 30; i += 1) applyPickerRow('Sync', 'sync:50', engine);
    expect(engine.audioSyncMs).toBe(SYNC_LIMIT_MS);
    applyPickerRow('Sync', 'sync:bogus', engine);
    expect(engine.audioSyncMs).toBe(SYNC_LIMIT_MS);
    applyPickerRow('Sync', 'sync:reset', engine);
    expect(engine.audioSyncMs).toBe(0);
    applyPickerRow('Sync', 'sync:-50', engine);
    expect(engine.audioSyncMs).toBe(-50);
  });
});

describe('quickBar', () => {
  it('maps the nine slots with live labels and resolves picker kinds', () => {
    const items = quickBarItems(details, '+75 ms', 'Off');
    expect(items.map((i) => i.label)).toEqual([
      'Search',
      'Channels list',
      'Recordings',
      'Multiview',
      'Picture-in-picture',
      '1280 × 720',
      'Mono',
      '+75 ms',
      'Off',
    ]);
    expect(items.map((i) => i.action)).toEqual([...QUICK_BAR_ACTIONS]);
    expect(
      quickBarItems(null, '0 ms', 'Off')
        .slice(5, 7)
        .map((i) => i.label),
    ).toEqual(['—', '—']);
    expect(pickerKindOf('Latency')).toBe('Sync');
    expect(pickerKindOf('Search')).toBeNull();
    expect(PICKER_TITLES.Subtitles).toBe('Closed captions');
  });
});
