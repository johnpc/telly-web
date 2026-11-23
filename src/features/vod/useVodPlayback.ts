import { useMemo, useSyncExternalStore } from 'react';
import { useKeyHandler } from '@/core/input/useKeyHandler';
import type { RemoteKey } from '@/core/input/remoteKeys';
import { useNavigator } from '@/core/navigation/useNavigator';
import { defaultVodDeps, type VodDeps } from './vodDeps';
import { VodPlaybackHolder } from './vodPlaybackHolder';
import { onVodPlaybackKey } from './vodPlaybackKeys';
import { VodPlaybackViewModel } from './vodPlaybackViewModel';

const noSubscribe = (): (() => void) => () => undefined;

/**
 * Owns one VOD playback visit (Android `VodPlaybackScreen`'s remember +
 * DisposableEffect): the ViewModel — and with it the screen's OWN engine —
 * is built and started when the screen subscribes, released when it leaves;
 * the D-pad reaches the transport only while Playing. Null on the server
 * snapshot only.
 */
export function useVodPlayback(itemKey: string, deps: VodDeps = defaultVodDeps): VodPlaybackViewModel | null {
  const navigator = useNavigator();
  const holder = useMemo(
    () => new VodPlaybackHolder(() => new VodPlaybackViewModel(deps, itemKey, () => navigator.pop())),
    [deps, itemKey, navigator],
  );
  const viewModel = useSyncExternalStore(holder.subscribe, holder.getSnapshot, () => null);
  useSyncExternalStore(
    viewModel?.subscribe ?? noSubscribe,
    () => viewModel?.version ?? 0,
    () => 0,
  );
  useKeyHandler((key: RemoteKey) => vodPlaybackKey(viewModel, key));
  return viewModel;
}

/** Transport keys apply while Playing only; the resume prompt's keys belong to its rows. */
export function vodPlaybackKey(viewModel: VodPlaybackViewModel | null, key: RemoteKey): boolean {
  if (viewModel === null || viewModel.stage.kind !== 'Playing') return false;
  return onVodPlaybackKey(key, viewModel.controls);
}
