import type { JSX } from 'react';
import { CustomRecordingFormScreen } from './CustomRecordingFormScreen';
import { RecordingConfirmScreen } from './RecordingConfirmScreen';
import type { RecordingMenu } from './recordingMenu';
import { stopConfirmCopy } from './recordingsLibrary';

/** The two DVR layers a host pushes over its sheet (playback overlay / guide layer carry these fields). */
export type RecordingLayer =
  { kind: 'RecordingStop'; recordingId: number; channelName: string } | { kind: 'CustomRecording' };

export interface RecordingLayerProps {
  layer: RecordingLayer;
  /** The host's DVR adapter: its primed form plus the Stop confirm's OK. */
  record: { menu: RecordingMenu; confirmStop(recordingId: number): void };
  /** BACK / Cancel: the host pops one level. */
  onBack: () => void;
}

/**
 * Renders a host's pushed DVR layer: the "Stop recording?" GuidedStep behind
 * a second Record on a channel that is already being captured, or the
 * custom-recording form (Android `PlaybackScreenMenuLayers` / `GuideScreenRowMenu`).
 */
export function RecordingLayerScreen({ layer, record, onBack }: RecordingLayerProps): JSX.Element {
  if (layer.kind === 'CustomRecording')
    return <CustomRecordingFormScreen menu={record.menu} onBack={onBack} />;
  return (
    <RecordingConfirmScreen
      {...stopConfirmCopy(layer.channelName)}
      testId="recording-stop-confirm"
      onAccept={() => record.confirmStop(layer.recordingId)}
      onDismiss={onBack}
    />
  );
}
