import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppDepsContext } from './appContext';
import { StartRoute } from './startRoute';
import { START_NOTICE_MS, useStartNotice } from './useStartNotice';

describe('useStartNotice', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the unmatched-link notice and dismisses it after the timeout', () => {
    const startRoute = new StartRoute(() => true, { kind: 'Channel', query: 'Nope' });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AppDepsContext value={{ startRoute }}>{children}</AppDepsContext>
    );
    const { result } = renderHook(() => useStartNotice(), { wrapper });
    expect(result.current).toEqual({ kind: 'None' });
    act(() => {
      startRoute.decide(2, []);
    });
    expect(result.current).toEqual({ kind: 'NoSuchChannel', query: 'Nope' });
    act(() => {
      vi.advanceTimersByTime(START_NOTICE_MS - 1);
    });
    expect(result.current.kind).toBe('NoSuchChannel');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toEqual({ kind: 'None' });
  });
});
