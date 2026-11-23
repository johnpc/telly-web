import type { JSX } from 'react';
import { displayName } from '@/core/db/types';
import { Focusable } from '@/core/focus/Focusable';
import { VideoSurface, useEngineState } from '@/core/player';
import { type PaneCell, cellStyle, paneFocusId } from './multiviewGrid';
import type { MultiviewPane } from './multiviewPanes';

interface PaneProps {
  pane: MultiviewPane;
  cell: PaneCell;
  focused: boolean;
  onFocus: () => void;
  onOk: () => void;
}

/** Per-pane stream failure, in the app's error text treatment. */
function PaneError({ name, message }: { name: string; message: string }): JSX.Element {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-[0.5rem]">
      <span className="text-[1.875rem] text-white">{name}</span>
      <span className="text-[1.625rem] text-telly-error">Playback error — {message}</span>
    </div>
  );
}

/**
 * One pane of the multiview grid: its own engine's video letterboxed inside
 * the cell, a white focus border (the focused pane owns audio) and per-pane
 * error text when the stream fails. Data attributes carry the pane's channel
 * and audio state for the acceptance suite (no actual audio asserts).
 */
export function MultiviewScreenPane({ pane, cell, focused, onFocus, onOk }: PaneProps): JSX.Element {
  const state = useEngineState(pane.engine);
  const name = displayName(pane.channel);
  return (
    <div className="absolute p-[0.5rem]" style={cellStyle(cell)}>
      <Focusable
        focusId={paneFocusId(pane.id)}
        data-testid="multiview-pane"
        data-pane-id={pane.id}
        data-channel-name={name}
        data-audio={focused ? 'audio' : 'muted'}
        aria-label={`Screen ${pane.id}: ${name}, ${focused ? 'audio' : 'muted'}`}
        onFocusCapture={onFocus}
        onClick={onOk}
        className="relative h-full w-full overflow-hidden rounded-lg border-[0.25rem] border-transparent bg-black"
        focusedClassName="border-white"
      >
        <VideoSurface engine={pane.engine} className="h-full w-full bg-black" />
        {state.kind === 'Error' && <PaneError name={name} message={state.message} />}
      </Focusable>
    </div>
  );
}
