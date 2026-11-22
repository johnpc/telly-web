import { act, renderHook } from '@testing-library/react';
import { type Mock, describe, expect, it, vi } from 'vitest';
import type { FocusEngine } from '@/core/focus/focusEngine';
import type { RestoreHooks } from './restoreRunner';
import { RESTORE_PILL_ID, useRestoreOffer } from './useRestoreOffer';
import type { RestoreOffer } from './welcomeRestore';

function hooks(
  offer: RestoreOffer,
  restored = true,
): RestoreHooks & { land: Mock<() => void>; requestAccess: Mock<() => void> } {
  return {
    probe: () => Promise.resolve(offer),
    restore: vi.fn(() => Promise.resolve(restored)),
    requestAccess: vi.fn((): void => undefined),
    land: vi.fn((): void => undefined),
  };
}

const engine = (): FocusEngine & { focus: ReturnType<typeof vi.fn> } =>
  ({ focus: vi.fn(() => true) }) as unknown as FocusEngine & { focus: ReturnType<typeof vi.fn> };

describe('useRestoreOffer', () => {
  it('probes on mount, focuses the pill when a backup is ready, restores once and lands', async () => {
    const h = hooks({ kind: 'Ready', json: '{}' });
    const focus = engine();
    const { result } = renderHook(() => useRestoreOffer(h, focus));
    expect(result.current.offer).toEqual({ kind: 'None' });
    await act(async () => undefined);
    expect(result.current.offer).toEqual({ kind: 'Ready', json: '{}' });
    expect(focus.focus).toHaveBeenCalledWith(RESTORE_PILL_ID);
    act(() => result.current.activate());
    expect(result.current.busy).toBe(true);
    act(() => result.current.activate());
    await act(async () => undefined);
    expect(h.restore).toHaveBeenCalledTimes(1);
    expect(h.land).toHaveBeenCalledTimes(1);
  });

  it('a failed restore releases the pill; NeedsAccess asks for the grant; None does nothing', async () => {
    const failing = hooks({ kind: 'Ready', json: '{}' }, false);
    const { result } = renderHook(() => useRestoreOffer(failing, engine()));
    await act(async () => undefined);
    act(() => result.current.activate());
    await act(async () => undefined);
    expect(result.current.busy).toBe(false);
    expect(failing.land).not.toHaveBeenCalled();

    const needs = hooks({ kind: 'NeedsAccess' });
    const access = renderHook(() => useRestoreOffer(needs, engine()));
    await act(async () => undefined);
    act(() => access.result.current.activate());
    expect(needs.requestAccess).toHaveBeenCalledTimes(1);

    const none = hooks({ kind: 'None' });
    const focus = engine();
    const plain = renderHook(() => useRestoreOffer(none, focus));
    await act(async () => undefined);
    act(() => plain.result.current.activate());
    expect(focus.focus).not.toHaveBeenCalled();
    expect(none.restore).not.toHaveBeenCalled();
  });

  it('drops a probe result that lands after unmount', async () => {
    let resolve: (offer: RestoreOffer) => void = () => undefined;
    const late: RestoreHooks = { ...hooks({ kind: 'None' }), probe: () => new Promise((r) => (resolve = r)) };
    const focus = engine();
    const { unmount } = renderHook(() => useRestoreOffer(late, focus));
    unmount();
    resolve({ kind: 'Ready', json: '{}' });
    await act(async () => undefined);
    expect(focus.focus).not.toHaveBeenCalled();
  });
});
