import { describe, expect, it, vi } from 'vitest';
import { KeyRouter, type KeyRouterFallbacks } from './keyRouter';
import { digit, type RemoteKey } from './remoteKeys';

function fallbacks(): KeyRouterFallbacks & { moveFocus: ReturnType<typeof vi.fn> } {
  return { moveFocus: vi.fn(() => true), activate: vi.fn(() => true), back: vi.fn() };
}

describe('KeyRouter', () => {
  it('offers keys to the top handler first and falls through on false', () => {
    const router = new KeyRouter(fallbacks());
    const seen: string[] = [];
    router.push((key) => {
      seen.push(`bottom:${String(key)}`);
      return true;
    });
    router.push((key) => {
      seen.push(`top:${String(key)}`);
      return key === 'MENU';
    });
    expect(router.dispatch('MENU')).toBe(true);
    expect(router.dispatch('OK')).toBe(true);
    expect(seen).toEqual(['top:MENU', 'top:OK', 'bottom:OK']);
    expect(router.depth).toBe(2);
  });

  it('removes a handler via the returned function (idempotently)', () => {
    const fb = fallbacks();
    const router = new KeyRouter(fb);
    const handler = vi.fn(() => true);
    const remove = router.push(handler);
    remove();
    remove();
    router.dispatch('UP');
    expect(handler).not.toHaveBeenCalled();
    expect(fb.moveFocus).toHaveBeenCalledWith('UP');
    expect(router.depth).toBe(0);
  });

  it('applies the built-in behaviour when nobody handles a key', () => {
    const fb = fallbacks();
    const router = new KeyRouter(fb);
    expect(router.dispatch('LEFT')).toBe(true);
    expect(fb.moveFocus).toHaveBeenCalledWith('LEFT');
    expect(router.dispatch('OK')).toBe(true);
    expect(fb.activate).toHaveBeenCalledTimes(1);
    expect(router.dispatch('BACK')).toBe(true);
    expect(fb.back).toHaveBeenCalledTimes(1);
    expect(router.dispatch('PLAY_PAUSE')).toBe(false);
    expect(router.dispatch(digit(4))).toBe(false);
  });

  it('reports false when the focus engine could not move', () => {
    const fb = fallbacks();
    fb.moveFocus.mockReturnValue(false);
    expect(new KeyRouter(fb).dispatch('DOWN')).toBe(false);
  });

  it('lets the host swap a fallback later', () => {
    const fb = fallbacks();
    const router = new KeyRouter(fb);
    const back = vi.fn();
    router.setFallbacks({ back });
    router.dispatch('BACK');
    expect(back).toHaveBeenCalledTimes(1);
    expect(fb.back).not.toHaveBeenCalled();
  });

  it('survives a handler that unsubscribes itself mid-dispatch', () => {
    const router = new KeyRouter(fallbacks());
    const seen: RemoteKey[] = [];
    const remove = router.push((key) => {
      remove();
      seen.push(key);
      return false;
    });
    router.push(() => false);
    expect(router.dispatch('MENU')).toBe(false);
    expect(seen).toEqual(['MENU']);
    expect(router.depth).toBe(1);
  });
});
