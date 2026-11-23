import { render } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { KeyQueue } from './keyQueue';
import { KeyRouter } from './keyRouter';
import { KeyRouterContext } from './keyRouterContext';
import { useHoldKeys, useReplayHeldKeys } from './useKeyQueue';

describe('KeyQueue', () => {
  it('holds keys in order, replays one per step once ready, then goes Live; a double step per commit is a no-op', () => {
    const queue = new KeyQueue();
    expect(queue.hold('BACK')).toBe(true);
    expect(queue.hold('RIGHT')).toBe(true);
    expect(queue.state).toEqual({ kind: 'Holding', keys: ['BACK', 'RIGHT'] });
    expect(queue.size).toBe(2);
    queue.setReady(true);
    expect(queue.state).toEqual({ kind: 'Replaying', remaining: ['BACK', 'RIGHT'] });
    expect(queue.hold('UP')).toBe(false);
    const stale = queue.version - 1;
    expect(queue.replayOne(stale)).toBeUndefined();
    expect(queue.replayOne(queue.version)).toBe('BACK');
    expect(queue.size).toBe(1);
    expect(queue.replayOne(queue.version)).toBe('RIGHT');
    expect(queue.state).toEqual({ kind: 'Live' });
    expect(queue.size).toBe(0);
    expect(queue.replayOne(queue.version)).toBeUndefined();
    expect(queue.hold('UP')).toBe(false);
  });

  it('ready with nothing held goes straight Live; losing readiness re-opens the hold with the remainder', () => {
    const queue = new KeyQueue();
    queue.setReady(true);
    expect(queue.state).toEqual({ kind: 'Live' });
    queue.setReady(true);
    queue.setReady(false);
    expect(queue.state).toEqual({ kind: 'Holding', keys: [] });
    queue.hold('UP');
    queue.hold('DOWN');
    queue.setReady(true);
    queue.replayOne(queue.version);
    queue.setReady(false);
    expect(queue.state).toEqual({ kind: 'Holding', keys: ['DOWN'] });
    queue.setReady(false);
    expect(queue.state).toEqual({ kind: 'Holding', keys: ['DOWN'] });
  });
});

describe('useHoldKeys / useReplayHeldKeys', () => {
  function setup(): { router: KeyRouter; queue: KeyQueue; back: ReturnType<typeof vi.fn> } {
    const back = vi.fn();
    const router = new KeyRouter({ moveFocus: () => false, activate: () => false, back });
    return { router, queue: new KeyQueue(), back };
  }

  it('swallows keys while holding and replays them through the router, one per commit, under StrictMode', () => {
    const { router, queue, back } = setup();
    const seen: string[] = [];
    const screenHandler = vi.fn((key: unknown) => {
      seen.push(String(key));
      return true;
    });
    function Probe({ ready }: { ready: boolean }): null {
      useReplayHeldKeys(queue, ready);
      return null;
    }
    function Holder(): null {
      useHoldKeys(queue);
      return null;
    }
    const tree = (ready: boolean): React.JSX.Element => (
      <StrictMode>
        <KeyRouterContext value={router}>
          <Probe ready={ready} />
          <Holder />
        </KeyRouterContext>
      </StrictMode>
    );
    router.push(screenHandler);
    const view = render(tree(false));
    expect(router.dispatch('BACK')).toBe(true);
    expect(router.dispatch('RIGHT')).toBe(true);
    expect(back).not.toHaveBeenCalled();
    expect(screenHandler).not.toHaveBeenCalled();
    expect(queue.size).toBe(2);
    view.rerender(tree(true));
    expect(seen).toEqual(['BACK', 'RIGHT']);
    expect(queue.state).toEqual({ kind: 'Live' });
    expect(router.dispatch('UP')).toBe(true);
    expect(seen).toEqual(['BACK', 'RIGHT', 'UP']);
    view.rerender(tree(false));
    expect(router.dispatch('DOWN')).toBe(true);
    expect(seen).toHaveLength(3);
    view.rerender(tree(true));
    expect(seen).toEqual(['BACK', 'RIGHT', 'UP', 'DOWN']);
  });

  it('a hold predicate lets other keys through to the live handlers', () => {
    const { router, queue, back } = setup();
    function Holder(): null {
      useHoldKeys(queue, (key) => key === 'DOWN');
      return null;
    }
    render(
      <KeyRouterContext value={router}>
        <Holder />
      </KeyRouterContext>,
    );
    expect(router.dispatch('BACK')).toBe(true);
    expect(back).toHaveBeenCalledTimes(1);
    expect(router.dispatch('DOWN')).toBe(true);
    expect(queue.state).toEqual({ kind: 'Holding', keys: ['DOWN'] });
  });
});
