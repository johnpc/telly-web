import { useSyncExternalStore } from 'react';
import { softRemoteInset } from '@/core/ui/softRemoteInset';
import { type CanvasDp, canvasDp } from './canvas';

let cached: CanvasDp | null = null;
let cachedKey = '';

function snapshot(): CanvasDp {
  const key = `${window.innerWidth}x${window.innerHeight}-${softRemoteInset.value}`;
  if (cached === null || key !== cachedKey) {
    cached = canvasDp(window.innerWidth, window.innerHeight, softRemoteInset.value);
    cachedKey = key;
  }
  return cached;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('resize', onChange);
  const unsubscribe = softRemoteInset.subscribe(onChange);
  return () => {
    window.removeEventListener('resize', onChange);
    unsubscribe();
  };
}

/** The dp canvas the screens lay out on; re-renders on resize / rotation and when the soft remote opens or closes. */
export function useCanvasDp(): CanvasDp {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
