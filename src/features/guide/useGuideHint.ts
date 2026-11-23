import { useEffect, useState, useSyncExternalStore } from 'react';
import type { KeyValueStore } from '@/core/kv/keyValueStore';
import { GuideHint } from './guideHint';

/** True while the first-open hint toast shows; shown once ever, auto-hidden (the `Guide hint` machine). */
export function useGuideHint(store: KeyValueStore): boolean {
  const [hint] = useState(() => new GuideHint(store));
  const state = useSyncExternalStore(hint.subscribe, () => hint.state);
  useEffect(() => hint.start(), [hint]);
  return state.kind === 'Showing';
}
