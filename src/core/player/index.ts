// Public surface of the player seam. Feature slices import from here; the
// media libraries never leak past this directory.
export type { AudioSyncSupport, LoadOptions, PlayerEngine } from './engine/PlayerEngine';
export type { EngineState, EngineStateKind } from './connection/engineState';
export { isStreaming } from './connection/engineState';
export type { ResizeMode } from './video/resizeMode';
export { objectFitOf, resizeModeOf } from './video/resizeMode';
export type { StreamDetails } from './telemetry/streamDetails';
export {
  badges,
  channelLayoutLabel,
  formatResolution,
  fpsLabel,
  resolutionLabel,
} from './telemetry/streamDetails';
export type { AudioTrack, TextTrack, TrackSnapshot, VideoTrack } from './engine/trackModels';
export { NO_TRACKS } from './engine/trackModels';
export type { Lease } from './engine/sharedPlayerEngine';
export { SharedPlayerEngine } from './engine/sharedPlayerEngine';
export type { EngineCapabilities, EngineKind } from './transport/createEngine';
export {
  createEngine,
  createSharedEngine,
  detectCapabilities,
  resolveEngineKind,
} from './transport/createEngine';
export { WebPlayerEngine } from './engine/webPlayerEngine';
export type { EngineDeps } from './engine/engineDeps';
export { createVideoElement, VIDEO_TESTID } from './video/videoElement';
export { useEnginePaused, useEngineState, useLeasedEngine, usePlayerEngine } from './video/usePlayerEngine';
export { VideoSurface, type VideoSurfaceProps } from './video/VideoSurface';
export { LOG_TAG } from './telemetry/playbackTelemetry';
