import type { ChannelRow, ProgramRow } from '@/core/db/types';
import { programTitle } from '@/features/epg/nowNext';
import type { SearchOverlays } from '@/features/search/searchOverlay';
import type { RecordingCenter } from '../recordingCenter';
import { RecordingMenu } from '../recordingMenu';
import type { RecordingPrompt } from '../recordingPrompt';
import { recordingCenter } from '../recordingRuntime';

/** The search dropdown's DVR surface (Android `SearchProgramMenu`'s recording half). */
export interface SearchRecording {
  menu: RecordingMenu;
  /** Guide-cell parity: Record schedules the hit's exact slot (instant when it is airing now). */
  record(channel: ChannelRow, program: ProgramRow, nowMs: number): void;
  customRecording(channel: ChannelRow): void;
  /** BACK with the form up drops its state before the overlay closes. */
  dismiss(): void;
}

/** DVR prompts onto search overlays: the form opens, everything else closes the overlay. */
export function onSearchPrompt(
  prompt: RecordingPrompt,
  overlays: Pick<SearchOverlays, 'show' | 'dismiss'>,
): void {
  if (prompt.kind === 'CustomForm') overlays.show({ kind: 'CustomRecording' });
  else overlays.dismiss();
}

export function createSearchRecording(
  overlays: Pick<SearchOverlays, 'show' | 'dismiss'>,
  center: RecordingCenter = recordingCenter,
  clock: () => number = () => Date.now(),
): SearchRecording {
  const menu = new RecordingMenu({ center, clock, show: (prompt) => onSearchPrompt(prompt, overlays) });
  return {
    menu,
    record: (channel, program, nowMs) => {
      if (program.startMs <= nowMs && nowMs < program.endMs) return menu.onRecord(channel);
      menu.onRecordProgramme(channel, programTitle(program), program.startMs, program.endMs);
    },
    customRecording: (channel) => menu.onCustomRecording(channel),
    dismiss: () => menu.dismissForm(),
  };
}

const perOverlays = new WeakMap<object, SearchRecording>();

/** ONE adapter per search overlay stack, so the dropdown and the form screen share the primed form. */
export function searchRecordingFor(overlays: SearchOverlays): SearchRecording {
  const adapter = perOverlays.get(overlays) ?? createSearchRecording(overlays);
  perOverlays.set(overlays, adapter);
  return adapter;
}
