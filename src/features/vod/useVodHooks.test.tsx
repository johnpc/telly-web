import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { VodRepository } from '@/core/db/vodRepository';
import { FocusEngine } from '@/core/focus/focusEngine';
import { RemoteKeysProvider } from '@/core/input/RemoteKeysProvider';
import { Navigator } from '@/core/navigation/navigator';
import { NavigatorProvider } from '@/core/navigation/NavigatorProvider';
import { freshDb } from '@/test/dbFixtures';
import { cardIds, useFocusFirstCard, useVodBrowser } from './useVodBrowser';
import { browserView, inVodBrowser } from './vodBrowse';
import { useVodPlayback, vodPlaybackKey } from './useVodPlayback';
import { createVodDeps, type VodDeps } from './vodDeps';
import { fakeVodDeps, fakeVodEngine } from './vodTestSupport';

async function seededDeps(): Promise<{ deps: VodDeps; repository: VodRepository }> {
  const db = freshDb();
  const repository = new VodRepository(db);
  await repository.replaceForPlaylist(1, [
    {
      itemKey: 'bunny',
      name: 'Big Buck Bunny',
      groupTitle: 'Cinema',
      logoUrl: null,
      streamUrl: 'http://x/b.mp4',
    },
    { itemKey: 'doc', name: 'Doc', groupTitle: 'Documentary', logoUrl: null, streamUrl: 'http://x/d.mp4' },
  ]);
  return { deps: createVodDeps(undefined, repository, fakeVodEngine), repository };
}

describe('useVodBrowser', () => {
  it('derives categories and cards from the live tables and follows a category choice', async () => {
    const { deps, repository } = await seededDeps();
    const { result } = renderHook(() => useVodBrowser(deps));
    expect(result.current.empty).toBe(false);
    await waitFor(() => expect(result.current.categories).toEqual(['Cinema', 'Documentary']));
    expect(result.current.selected).toBe('Cinema');
    expect(cardIds(result.current.cards)).toEqual(['vod-card-bunny']);
    expect(result.current.cards[0]?.progressPermille).toBeNull();
    await repository.savePosition({
      itemKey: 'bunny',
      positionMs: 3_000,
      durationMs: 30_000,
      updatedAtMs: 1,
    });
    await waitFor(() => expect(result.current.cards[0]?.progressPermille).toBe(100));
    act(() => result.current.select('Documentary'));
    expect(result.current.selected).toBe('Documentary');
    expect(cardIds(result.current.cards)).toEqual(['vod-card-doc']);
  });

  it('reports empty once an empty read has resolved', async () => {
    const deps = fakeVodDeps([]);
    const { result } = renderHook(() => useVodBrowser(deps));
    await waitFor(() => expect(result.current.empty).toBe(true));
    expect(result.current.selected).toBeNull();
  });
});

describe('inVodBrowser / browserView', () => {
  it('recognises cards and category rows, and shapes the undefined-while-reading view', () => {
    expect(inVodBrowser(null)).toBe(false);
    expect(inVodBrowser('guide-rail-movies')).toBe(false);
    expect(inVodBrowser('vod-card-x')).toBe(true);
    expect(inVodBrowser('panel-group-Cinema')).toBe(true);
    expect(browserView({ items: undefined, positions: undefined }, null)).toEqual({
      categories: [],
      selected: null,
      cards: [],
      empty: false,
    });
  });
});

describe('useFocusFirstCard', () => {
  function registered(engine: FocusEngine, id: string): void {
    const element = document.createElement('div');
    document.body.appendChild(element);
    engine.register(id, 'vod', element);
  }

  it('focuses the first card once cards exist, unless focus already sits in the browser', () => {
    const engine = new FocusEngine((work) => work());
    engine.pushScope({ id: 'vod' });
    registered(engine, 'panel-group-Cinema');
    registered(engine, 'vod-card-bunny');
    registered(engine, 'vod-card-doc');
    const { rerender } = renderHook(({ ids }) => useFocusFirstCard(ids, engine), {
      initialProps: { ids: [] as string[] },
    });
    expect(engine.current).toBeNull();
    rerender({ ids: ['vod-card-bunny', 'vod-card-doc'] });
    expect(engine.current).toBe('vod-card-bunny');
    engine.focus('panel-group-Cinema');
    rerender({ ids: ['vod-card-doc'] });
    expect(engine.current).toBe('panel-group-Cinema');
    engine.focus('vod-card-doc');
    rerender({ ids: ['vod-card-bunny'] });
    expect(engine.current).toBe('vod-card-doc');
  });
});

describe('useVodPlayback', () => {
  function wrapper(navigator: Navigator): ({ children }: { children: ReactNode }) => ReactNode {
    return ({ children }) => (
      <NavigatorProvider navigator={navigator}>
        <RemoteKeysProvider onBack={() => navigator.pop()}>{children}</RemoteKeysProvider>
      </NavigatorProvider>
    );
  }

  it('starts the visit on mount, routes transport keys while Playing and releases on unmount', async () => {
    const deps = fakeVodDeps();
    deps.engine.durationMs = 30_000;
    const navigator = new Navigator({ kind: 'Vod' });
    navigator.push({ kind: 'VodPlayback', itemKey: 'bunny' });
    const { result, unmount } = renderHook(() => useVodPlayback('bunny', deps), {
      wrapper: wrapper(navigator),
    });
    await waitFor(() => expect(result.current?.stage).toEqual({ kind: 'Playing' }));
    expect(deps.engine.calls).toEqual(['load:http://x/bunny.mp4@0']);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(deps.engine.positionMs).toBe(10_000);
    act(() => void result.current?.exit());
    await waitFor(() => expect(navigator.current).toEqual({ kind: 'Vod' }));
    expect(deps.rows.get('bunny')?.positionMs).toBe(10_000);
    unmount();
    expect(deps.engine.calls).toContain('release');
  });

  it('vodPlaybackKey ignores keys before the model exists or while the prompt is up', () => {
    const deps = fakeVodDeps();
    expect(vodPlaybackKey(null, 'OK')).toBe(false);
    const navigator = new Navigator({ kind: 'Vod' });
    deps.rows.set('bunny', { itemKey: 'bunny', positionMs: 12_000, durationMs: 30_000, updatedAtMs: 0 });
    const { result } = renderHook(() => useVodPlayback('bunny', deps), { wrapper: wrapper(navigator) });
    return waitFor(() => expect(result.current?.stage.kind).toBe('ResumePrompt')).then(() => {
      expect(vodPlaybackKey(result.current, 'RIGHT')).toBe(false);
      expect(deps.engine.calls).toEqual([]);
    });
  });
});
