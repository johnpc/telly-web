// Render-only host for the engine's `<video>`. The element itself is created
// once by the engine (`createVideoElement`: playsInline, autoplay, unmuted,
// no controls, data-testid="video-surface", data-state=<EngineState.kind>)
// and this component only re-parents it, so mounting a second surface
// (fullscreen) while the first (guide preview) is still up never re-tunes.
// The host is a one-cell grid: the element and the zap frame-hold canvas
// (`FrameHold`, re-parented with it) stack in that cell without the host
// needing a position of its own.
import { useEffect, useRef, type JSX } from 'react';
import type { PlayerEngine } from '../engine/PlayerEngine';
import { useEngineState } from './usePlayerEngine';

export interface VideoSurfaceProps {
  engine: PlayerEngine;
  className?: string;
}

const ONE_CELL = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gridTemplateRows: 'minmax(0, 1fr)',
} as const;

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
      style={ONE_CELL}
      data-testid="video-surface-host"
      data-state={state.kind}
    />
  );
}
