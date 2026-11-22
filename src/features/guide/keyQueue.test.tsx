import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { KeyRouter } from '@/core/input/keyRouter';
import { KeyRouterContext } from '@/core/input/keyRouterContext';
import { KeyQueue } from './keyQueue';
import { useQueueWhileLoading, useReplayQueuedKeys } from './useKeyQueue';

describe('KeyQueue', () => {
  it('parks keys in order, shifts them out and notifies on every change', () => {
    const queue = new KeyQueue();
    let changes = 0;
    queue.subscribe(() => (changes += 1));
    queue.push('BACK');
    queue.push('RIGHT');
    expect(queue.size).toBe(2);
    expect(queue.shift()).toBe('BACK');
    expect(queue.shift()).toBe('RIGHT');
    expect(queue.shift()).toBeUndefined();
    expect(changes).toBe(4);
  });
});

describe('useQueueWhileLoading / useReplayQueuedKeys', () => {
  it('swallows keys while loading and replays them through the router when ready', () => {
    const back = vi.fn();
    const router = new KeyRouter({ moveFocus: () => false, activate: () => false, back });
    const queue = new KeyQueue();
    const guideHandler = vi.fn(() => true);
    function Probe({ loading, ready }: { loading: boolean; ready: boolean }): null {
      useQueueWhileLoading(queue, loading);
      useReplayQueuedKeys(queue, ready);
      return null;
    }
    const view = render(
      <KeyRouterContext value={router}>
        <Probe loading ready={false} />
      </KeyRouterContext>,
    );
    expect(router.dispatch('BACK')).toBe(true);
    expect(back).not.toHaveBeenCalled();
    expect(queue.size).toBe(1);
    router.push(guideHandler);
    view.rerender(
      <KeyRouterContext value={router}>
        <Probe loading={false} ready />
      </KeyRouterContext>,
    );
    expect(guideHandler).toHaveBeenCalledWith('BACK');
    expect(queue.size).toBe(0);
    queue.push('UP');
    queue.push('DOWN');
    view.rerender(
      <KeyRouterContext value={router}>
        <Probe loading={false} ready={false} />
      </KeyRouterContext>,
    );
    view.rerender(
      <KeyRouterContext value={router}>
        <Probe loading={false} ready />
      </KeyRouterContext>,
    );
    expect(guideHandler).toHaveBeenCalledWith('UP');
    expect(guideHandler).toHaveBeenCalledWith('DOWN');
    expect(queue.shift()).toBeUndefined();
    guideHandler.mockReturnValue(false);
    expect(router.dispatch('BACK')).toBe(true);
    expect(back).toHaveBeenCalledTimes(1);
  });
});
