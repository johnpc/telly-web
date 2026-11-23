import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { ChannelRow } from '@/core/db/types';
import { focusEngine } from '@/core/focus/focusEngine';
import type { RemoteKey } from '@/core/input/remoteKeys';
import { useKeyHandler } from '@/core/input/useKeyHandler';
import { useNavigator } from '@/core/navigation/useNavigator';
import { TellySettings } from '@/core/settings/tellySettings';
import { useSetting } from '@/core/settings/useSetting';
import { useGatePrompt } from '@/features/playback/usePlaybackStores';
import { createMultiviewViewModel, multiviewDeps, type MultiviewDeps } from './multiviewDeps';
import { paneFocusId } from './multiviewGrid';
import type { MultiviewLayer } from './multiviewLayer';
import type { MultiviewPane } from './multiviewPanes';
import type { MultiviewViewModel } from './multiviewViewModel';

const NO_CHANNELS: readonly ChannelRow[] = [];

export interface MultiviewView {
  vm: MultiviewViewModel;
  layer: MultiviewLayer;
  panes: readonly MultiviewPane[];
  focusedId: number;
  /** The blocked channel awaiting a PIN over the multiview layers, or null. */
  prompt: ChannelRow | null;
  channels: readonly ChannelRow[];
}

/** CH+/- zap the focused pane in place, like fullscreen playback. */
export function channelKey(vm: Pick<MultiviewViewModel, 'onChannelKey'>, key: RemoteKey): boolean {
  if (key === 'CHANNEL_UP') vm.onChannelKey(+1);
  else if (key === 'CHANNEL_DOWN') vm.onChannelKey(-1);
  else return false;
  return true;
}

/**
 * D-pad focus returns to the focused pane whenever the grid is the active
 * layer again (menu / picker / PIN card closed) or the grid reshapes (a new
 * pane was added, the focused one removed).
 */
function usePaneFocus(
  layer: MultiviewLayer,
  focusedId: number,
  promptOpen: boolean,
  paneCount: number,
): void {
  useEffect(() => {
    if (layer.kind === 'Panes' && !promptOpen && paneCount > 0) focusEngine.focus(paneFocusId(focusedId));
  }, [layer, focusedId, promptOpen, paneCount]);
}

/** Owns the multiview ViewModel for the screen's lifetime; every pane engine is released on unmount. */
export function useMultiview(deps: MultiviewDeps = multiviewDeps): MultiviewView {
  const navigator = useNavigator();
  const [vm] = useState(() => createMultiviewViewModel(deps, () => navigator.pop()));
  useEffect(() => () => vm.close(), [vm]);
  const channels = useLiveQuery(() => deps.channels(), [deps]) ?? NO_CHANNELS;
  useEffect(() => {
    vm.setChannels(channels);
    vm.start();
  }, [vm, channels]);
  const [resizeRaw] = useSetting(TellySettings.RESIZE_MODE);
  useEffect(() => vm.panes.setResizeMode(resizeRaw), [vm, resizeRaw]);
  const layer = useSyncExternalStore(vm.subscribe, () => vm.layer);
  const panes = useSyncExternalStore(vm.panes.subscribe, () => vm.panes.panes);
  const focusedId = useSyncExternalStore(vm.panes.subscribe, () => vm.panes.focusedId);
  const prompt = useGatePrompt(deps.gate);
  useKeyHandler(useCallback((key: RemoteKey) => channelKey(vm, key), [vm]));
  usePaneFocus(layer, focusedId, prompt !== null, panes.length);
  return { vm, layer, panes, focusedId, prompt, channels };
}
