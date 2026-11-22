import { useEffect, useRef, type RefObject } from 'react';
import type { RemoteKey } from '@/core/input/remoteKeys';
import { useKeyHandler } from '@/core/input/useKeyHandler';

export type KeyBuffer = RefObject<RemoteKey[]>;

/**
 * Keys pressed while the playback screen is still leasing its engine and
 * loading the channel list are held, not dropped — Android's window queues
 * input events the same way while the activity is being created.
 */
export function useStartupKeyBuffer(active: boolean): KeyBuffer {
  const buffer = useRef<RemoteKey[]>([]);
  useKeyHandler((key: RemoteKey) => {
    buffer.current.push(key);
    return true;
  }, active);
  return buffer;
}

/** Once the first channel is tuned, the held keys play through the live key map in order. */
export function useReplayKeys(buffer: KeyBuffer, ready: boolean, onKey: (key: RemoteKey) => boolean): void {
  useEffect(() => {
    if (!ready) return;
    for (const key of buffer.current.splice(0)) onKey(key);
  }, [buffer, ready, onKey]);
}
