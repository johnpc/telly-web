import type { PlayerEngine, StreamDetails, TrackSnapshot } from '@/core/player';
import { TrackLabels } from './trackLabels';
import type { TrackPickerKind } from './trackPickerKind';

/** One row of a picker dialog; `checked` marks the active option. */
export interface TrackPickerRow {
  id: string;
  label: string;
  checked: boolean;
}

export const AUTO = 'auto';
export const OFF = 'off';
/** The single rendition a container without selectable tracks is playing (mpegts.js reports none). */
export const CURRENT = 'current';
export const SYNC_LIMIT_MS = 1_000;
const RESET = 'sync:reset';
const SYNC_PREFIX = 'sync:';
const SYNC_STEPS_MS = [-50, -25, 25, 50];

/** What the picker rows are derived from: the engine's snapshot plus the probed stream facts. */
export interface TrackSource {
  tracks: TrackSnapshot;
  details: StreamDetails | null;
  audioSyncMs: number;
}

const row = (id: string, label: string, checked = false): TrackPickerRow => ({ id, label, checked });

function videoRows({ tracks, details }: TrackSource): TrackPickerRow[] {
  const renditions = tracks.videos.map((t) =>
    row(t.id, TrackLabels.video(t), t.id === tracks.videoOverrideId),
  );
  const probed = details !== null && details.width > 0 && details.height > 0;
  if (renditions.length === 0 && probed) renditions.push(row(CURRENT, `${details.width}×${details.height}`));
  return [row(AUTO, 'Auto', tracks.videoOverrideId === null), ...renditions];
}

function audioRows({ tracks, details }: TrackSource): TrackPickerRow[] {
  const rows = tracks.audios.map((t, i) =>
    row(t.id, TrackLabels.audio(t, i), t.id === tracks.selectedAudioId),
  );
  if (rows.length === 0 && details !== null && details.audioChannels > 0) {
    rows.push(
      row(
        CURRENT,
        TrackLabels.audio({ id: CURRENT, language: null, channels: details.audioChannels }, 0),
        true,
      ),
    );
  }
  return rows;
}

function textRows({ tracks }: TrackSource): TrackPickerRow[] {
  return [
    row(OFF, 'Off', tracks.selectedTextId === null),
    ...tracks.texts.map((t, i) => row(t.id, TrackLabels.text(t, i), t.id === tracks.selectedTextId)),
  ];
}

function syncRows(): TrackPickerRow[] {
  return [
    ...SYNC_STEPS_MS.map((ms) => row(`${SYNC_PREFIX}${ms}`, TrackLabels.sync(ms))),
    row(RESET, 'Reset'),
  ];
}

/**
 * The rows each picker shows: Video = "Auto" + every rendition; audio = the
 * stream's audio tracks; CC = "Off" + text tracks; sync = a stepper
 * (±25/50 ms within ±1000 ms) that keeps the dialog open (Android `TrackPickerRows`).
 */
export function pickerRows(kind: TrackPickerKind, source: TrackSource): TrackPickerRow[] {
  switch (kind) {
    case 'Video':
      return videoRows(source);
    case 'Audio':
      return audioRows(source);
    case 'Subtitles':
      return textRows(source);
    case 'Sync':
      return syncRows();
  }
}

function stepped(rowId: string, current: number): number {
  if (rowId === RESET) return 0;
  const delta = Number(rowId.slice(SYNC_PREFIX.length));
  if (!rowId.startsWith(SYNC_PREFIX) || Number.isNaN(delta)) return current;
  return Math.min(Math.max(current + delta, -SYNC_LIMIT_MS), SYNC_LIMIT_MS);
}

type TrackEngine = Pick<
  PlayerEngine,
  'selectVideoTrack' | 'selectAudioTrack' | 'selectTextTrack' | 'audioSyncMs'
>;

/** Applies `rowId` to the engine; true = the picker closes. */
export function applyPickerRow(kind: TrackPickerKind, rowId: string, engine: TrackEngine): boolean {
  switch (kind) {
    case 'Video':
      engine.selectVideoTrack(rowId === AUTO || rowId === CURRENT ? null : rowId);
      return true;
    case 'Audio':
      if (rowId !== CURRENT) engine.selectAudioTrack(rowId);
      return true;
    case 'Subtitles':
      engine.selectTextTrack(rowId === OFF ? null : rowId);
      return true;
    case 'Sync':
      engine.audioSyncMs = stepped(rowId, engine.audioSyncMs);
      return false;
  }
}
