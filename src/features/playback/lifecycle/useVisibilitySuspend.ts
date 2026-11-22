import { useEffect } from 'react';
import type { PlaybackLifecycle } from './playbackLifecycle';

/** `document.visibilitychange`: hidden stops the stream, visible re-tunes (Android STOP/START). */
export function useVisibilitySuspend(lifecycle: PlaybackLifecycle, doc: Document = document): void {
  useEffect(() => {
    const onChange = (): void => {
      if (doc.visibilityState === 'hidden') lifecycle.onBackground();
      else lifecycle.onForeground();
    };
    doc.addEventListener('visibilitychange', onChange);
    return () => doc.removeEventListener('visibilitychange', onChange);
  }, [lifecycle, doc]);
}
