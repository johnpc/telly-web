import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useIsTouchDevice } from './useIsTouchDevice';

interface FakeMediaQuery {
  matches: boolean;
  fire(): void;
}

function stubMatchMedia(matches: boolean): FakeMediaQuery {
  const listeners = new Set<() => void>();
  const mq: FakeMediaQuery = {
    matches,
    fire: () => listeners.forEach((l) => l()),
  };
  window.matchMedia = vi.fn(
    () =>
      ({
        get matches() {
          return mq.matches;
        },
        addEventListener: (_: string, l: () => void) => listeners.add(l),
        removeEventListener: (_: string, l: () => void) => listeners.delete(l),
      }) as unknown as MediaQueryList,
  );
  return mq;
}

describe('useIsTouchDevice', () => {
  afterEach(() => Reflect.deleteProperty(window, 'matchMedia'));

  it('reflects (pointer: coarse) and follows changes', () => {
    const mq = stubMatchMedia(false);
    const { result, unmount } = renderHook(() => useIsTouchDevice());
    expect(result.current).toBe(false);
    act(() => {
      mq.matches = true;
      mq.fire();
    });
    expect(result.current).toBe(true);
    unmount();
    expect(window.matchMedia).toHaveBeenCalledWith('(pointer: coarse)');
  });

  it('is false where matchMedia does not exist', () => {
    const { result } = renderHook(() => useIsTouchDevice());
    expect(result.current).toBe(false);
  });
});
