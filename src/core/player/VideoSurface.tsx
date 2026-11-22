// Render-only host for the engine's `<video>`. The element itself is created
// once by the engine (`createVideoElement`: playsInline, autoplay, unmuted,
// no controls, data-testid="video-surface", data-state=<EngineState.kind>)
// and this component only re-parents it, so mounting a second surface
// (fullscreen) while the first (guide preview) is still up never re-tunes.
import { useEffect, useRef, type JSX } from 'react';
import type { PlayerEngine } from './PlayerEngine';
import { useEngineState } from './usePlayerEngine';

export interface VideoSurfaceProps {
  engine: PlayerEngine;
  className?: string;
}

export function VideoSurface({ engine, className }: VideoSurfaceProps): JSX.Element {
  const host = useRef<HTMLDivElement>(null);
  const state = useEngineState(engine);
  useEffect(() => {
    if (host.current !== null) engine.moveVideoTo(host.current);
  }, [engine]);
  return (
    <div
      ref={host}
      className={className ?? 'h-full w-full bg-black'}
      data-testid="video-surface-host"
      data-state={state.kind}
    />
  );
}
