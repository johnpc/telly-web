import { useEffect, useState } from 'react';
import type { KeyValueStore } from '@/core/kv/keyValueStore';
import { HINT_HIDE_AFTER_MS, claimHint } from './guideHint';

/** True while the first-open hint toast shows; shown once ever, auto-hidden. */
export function useGuideHint(store: KeyValueStore): boolean {
  const [visible, setVisible] = useState(() => claimHint(store));
  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => setVisible(false), HINT_HIDE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [visible]);
  return visible;
}
