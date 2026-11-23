import { useEffect, useState } from 'react';
import type { RecordingRow } from '@/core/db/types';
import { type PlayerEngine, createEngine, createVideoElement } from '@/core/player';
import { useKeyHandler } from '@/core/input/useKeyHandler';
import type { RecordingCenter } from './recordingCenter';
import { TRANSPORT_POLL_MS, onCapturePlayerKey, transportForCapture } from './recordingPlayer';

export interface CaptureTransport {
  positionMs: number;
  durationMs: number;
}

/** One engine per capture player: created on mount, released on unmount (never the shared live engine). */
export function useCaptureEngine(filePath: string): PlayerEngine {
  const [engine] = useState(() => {
    const created = createEngine({ transportFor: transportForCapture(filePath) });
    created.attach(createVideoElement());
    return created;
  });
  useEffect(() => () => engine.release(), [engine]);
  return engine;
}

/**
 * Loads the OPFS capture into the engine through an object URL once the file
 * is closed (a stop may still be flushing when the row is opened), revoking
 * the URL on unmount.
 */
export function useCaptureSource(
  engine: PlayerEngine,
  row: RecordingRow,
  center: Pick<RecordingCenter, 'blobOf' | 'whenSettled'>,
): void {
  useEffect(() => loadCapture(engine, row, center), [engine, row, center]);
}

type CaptureSource = Pick<RecordingCenter, 'blobOf' | 'whenSettled'>;

/** Awaits the closed file, loads it through an object URL; the returned cleanup revokes the URL. */
export function loadCapture(engine: PlayerEngine, row: RecordingRow, center: CaptureSource): () => void {
  let url: string | null = null;
  let cancelled = false;
  const onBlob = (blob: Blob | null): void => {
    if (cancelled || blob === null) return;
    url = URL.createObjectURL(blob);
    engine.load(url, { live: false });
  };
  void center
    .whenSettled(row.id)
    .then(() => center.blobOf(row))
    .then(onBlob);
  return () => {
    cancelled = true;
    if (url !== null) URL.revokeObjectURL(url);
  };
}

/** Position/duration sampled twice a second for the transport bar. */
export function useCaptureTransport(engine: PlayerEngine): CaptureTransport {
  const [transport, setTransport] = useState<CaptureTransport>({ positionMs: 0, durationMs: 0 });
  useEffect(() => {
    const timer = setInterval(
      () => setTransport({ positionMs: engine.positionMs, durationMs: engine.durationMs }),
      TRANSPORT_POLL_MS,
    );
    return () => clearInterval(timer);
  }, [engine]);
  return transport;
}

/** LEFT/RIGHT seek, OK toggles pause; BACK belongs to the hosting scope. */
export function useCapturePlayerKeys(engine: PlayerEngine): void {
  useKeyHandler((key) => onCapturePlayerKey(key, engine));
}
