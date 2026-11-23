import { describe, expect, it } from 'vitest';
import { VodPlaybackHolder } from './vodPlaybackHolder';
import { VodPlaybackViewModel } from './vodPlaybackViewModel';
import { fakeVodDeps } from './vodTestSupport';

describe('VodPlaybackHolder', () => {
  it('builds and starts one model on the first subscribe and releases it on the last unsubscribe', async () => {
    const deps = fakeVodDeps();
    let built = 0;
    const holder = new VodPlaybackHolder(() => {
      built += 1;
      return new VodPlaybackViewModel(deps, 'bunny', () => undefined);
    });
    expect(holder.getSnapshot()).toBeNull();
    const offA = holder.subscribe(() => undefined);
    const offB = holder.subscribe(() => undefined);
    const model = holder.getSnapshot();
    expect(model).not.toBeNull();
    expect(built).toBe(1);
    await Promise.resolve();
    await Promise.resolve();
    expect(deps.engine.calls[0]).toBe('load:http://x/bunny.mp4@0');
    offA();
    expect(holder.getSnapshot()).toBe(model);
    offB();
    expect(holder.getSnapshot()).toBeNull();
    expect(deps.engine.calls).toContain('release');
    holder.subscribe(() => undefined);
    expect(built).toBe(2);
  });
});
