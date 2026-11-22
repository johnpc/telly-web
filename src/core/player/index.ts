// Public surface of the player seam. Feature slices import from here; the
// media libraries never leak past this directory.
export type { AudioSyncSupport, LoadOptions, PlayerEngine } from './PlayerEngine';
export type { EngineState, EngineStateKind } from './engineState';
export { isStreaming } from './engineState';
export type { ResizeMode } from './resizeMode';
export { objectFitOf, resizeModeOf } from './resizeMode';
export type { StreamDetails } from './streamDetails';
export { badges, channelLayoutLabel, formatResolution, fpsLabel, resolutionLabel } from './streamDetails';
export type { AudioTrack, TextTrack, TrackSnapshot, VideoTrack } from './trackModels';
export { NO_TRACKS } from './trackModels';
export type { Lease } from './sharedPlayerEngine';
export { SharedPlayerEngine } from './sharedPlayerEngine';
export type { EngineCapabilities, EngineKind } from './createEngine';
export { createEngine, createSharedEngine, detectCapabilities, resolveEngineKind } from './createEngine';
export { WebPlayerEngine } from './webPlayerEngine';
export type { EngineDeps } from './engineDeps';
export { createVideoElement, VIDEO_TESTID } from './videoElement';
export { useEnginePaused, useEngineState, useLeasedEngine, usePlayerEngine } from './usePlayerEngine';
export { VideoSurface, type VideoSurfaceProps } from './VideoSurface';
export { LOG_TAG } from './playbackTelemetry';
