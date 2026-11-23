import type { VodItemRow, VodPositionRow } from '@/core/db/types';
import type { VodDeps } from './vodDeps';
import { fakeVodEngine, type FakeVodEngine } from './vodFakeEngine';

export { fakeVodEngine, type FakeVodEngine } from './vodFakeEngine';

export function vodItem(itemKey: string, overrides: Partial<VodItemRow> = {}): VodItemRow {
  return {
    id: 1,
    playlistId: 1,
    sortIndex: 0,
    itemKey,
    name: itemKey,
    groupTitle: 'Cinema',
    logoUrl: null,
    streamUrl: `http://x/${itemKey}.mp4`,
    ...overrides,
  };
}

/** In-memory `VodDeps`: items and positions as maps, one shared fake engine, a settable clock/toggle. */
export interface FakeVodDeps extends VodDeps {
  engine: FakeVodEngine;
  rows: Map<string, VodPositionRow>;
  remember: boolean;
  now: number;
}

function fakeItems(items: VodItemRow[]): VodDeps['items'] {
  return {
    items: () => Promise.resolve(items),
    itemByKey: (key) => Promise.resolve(items.find((item) => item.itemKey === key) ?? null),
  };
}

function fakePositions(rows: Map<string, VodPositionRow>): VodDeps['positions'] {
  return {
    positions: () => Promise.resolve([...rows.values()]),
    positionByKey: (key) => Promise.resolve(rows.get(key) ?? null),
    savePosition: (row) => Promise.resolve(void rows.set(row.itemKey, row)),
    removePosition: (key) => Promise.resolve(void rows.delete(key)),
  };
}

export function fakeVodDeps(items: VodItemRow[] = [vodItem('bunny')]): FakeVodDeps {
  const engine = fakeVodEngine();
  const rows = new Map<string, VodPositionRow>();
  const deps: FakeVodDeps = {
    engine,
    rows,
    remember: true,
    now: 1_000,
    items: fakeItems(items),
    positions: fakePositions(rows),
    engineFactory: () => engine,
    rememberPosition: () => deps.remember,
    transportTimeoutMs: () => 5_000,
    clock: () => deps.now,
  };
  return deps;
}
