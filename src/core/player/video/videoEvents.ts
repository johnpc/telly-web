// Maps the `<video>` element's media events onto the engine's connection
// events — the web equivalent of Media3's `Player.Listener`:
// loadstart / waiting / seeking → Buffering, playing → READY (Playing),
// ended → Ended, error → the reconnect budget. `pause` is deliberately NOT a
// state (Android keeps `paused` beside `state`). Returns the unbind function.

export interface VideoEventHandlers {
  onBuffering(): void;
  onReady(): void;
  onEnded(): void;
  onError(message: string): void;
}

const ERROR_NAMES: Readonly<Record<number, string>> = {
  1: 'MEDIA_ERR_ABORTED',
  2: 'MEDIA_ERR_NETWORK',
  3: 'MEDIA_ERR_DECODE',
  4: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
};

/** `MediaError` codes → Android-style names for the Error state. */
export function mediaErrorName(error: MediaError | null | undefined): string {
  return ERROR_NAMES[error?.code ?? 0] ?? 'MEDIA_ERR_UNKNOWN';
}

type Binding = [event: string, handler: () => void];

function bindingsFor(video: HTMLVideoElement, handlers: VideoEventHandlers): Binding[] {
  const buffering = (): void => handlers.onBuffering();
  return [
    ['loadstart', buffering],
    ['waiting', buffering],
    ['seeking', buffering],
    ['playing', () => handlers.onReady()],
    ['ended', () => handlers.onEnded()],
    ['error', () => handlers.onError(mediaErrorName(video.error))],
  ];
}

export function bindVideoEvents(video: HTMLVideoElement, handlers: VideoEventHandlers): () => void {
  const bindings = bindingsFor(video, handlers);
  for (const [event, handler] of bindings) video.addEventListener(event, handler);
  return () => {
    for (const [event, handler] of bindings) video.removeEventListener(event, handler);
  };
}
