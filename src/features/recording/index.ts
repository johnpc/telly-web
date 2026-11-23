/** Public surface of the DVR recording slice (the shell + sibling slices import from here). */
export { RecordingsScreen } from './RecordingsScreen';
export { RecordingsHost } from './RecordingsHostScreen';
export { RecordingLayerScreen, type RecordingLayer } from './RecordingLayerScreen';
export { recordingLayer } from './hosts/recordingLayerHost';
export { CustomRecordingFormScreen } from './CustomRecordingFormScreen';
export { RecordingConfirmScreen } from './RecordingConfirmScreen';
export { TransportRecordDot } from './TransportRecordDotScreen';
export { type RecordingStatus, statusOf, recordingStatus, isPlanned } from './recordingStatus';
export { type RecordingPrompt } from './recordingPrompt';
export { RecordingMenu } from './recordingMenu';
export { CustomRecordingForm } from './customRecordingForm';
export { RecordingCenter } from './recordingCenter';
export {
  recordingCenter,
  recordingRuntime,
  deleteAllRecordings,
  type RecordingRuntime,
} from './recordingRuntime';
export {
  type RecordingListRow,
  recordingRows,
  recordingLabel,
  durationText,
  RECORDINGS_TITLE,
  RECORDINGS_EMPTY,
} from './recordingRows';
export { isRecording, recordDotLabel } from './recordingIndicator';
export { useRecordings, useChannelRecording } from './useRecordings';
export { RecordingsLibrary, type RecordingsConfirm, confirmCopy, stopConfirmCopy } from './recordingsLibrary';
export { isHls, FALLBACK_DURATION_MS } from './streamRecorder';
export {
  type PlaybackRecording,
  createPlaybackRecording,
  overlayFor as playbackOverlayFor,
} from './hosts/playbackRecording';
export { type GuideRecording, createGuideRecording, layerFor as guideLayerFor } from './hosts/guideRecording';
export { type SearchRecording, searchRecordingFor, createSearchRecording } from './hosts/searchRecording';
