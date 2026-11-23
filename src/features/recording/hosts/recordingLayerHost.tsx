import type { JSX } from 'react';
import { type RecordingLayer, type RecordingLayerProps, RecordingLayerScreen } from '../RecordingLayerScreen';

/**
 * Positional form of `RecordingLayerScreen` for hosts whose render switch is
 * already at its size/complexity budget (the playback menu layers).
 */
export function recordingLayer(
  layer: RecordingLayer,
  record: RecordingLayerProps['record'],
  onBack: () => void,
): JSX.Element {
  return <RecordingLayerScreen layer={layer} record={record} onBack={onBack} />;
}
