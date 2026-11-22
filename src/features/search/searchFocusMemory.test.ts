import { describe, expect, it, vi } from 'vitest';
import { TWELVE_HOUR } from './programTimes';
import { SearchFocusMemory, downTarget, nodeId, resultNodes } from './searchFocusMemory';
import { airingRowId, channelCardId, masterCardId } from './searchIds';
import { buildChannelHits, programHit, type SearchResults } from './searchResults';
import { channel, program } from './searchResults.test';
import { resolveSelection } from './searchSelection';

const NOW = 1_000_000;
const a = channel(1, 'News One');
const b = channel(2, 'News One +1');
const results: SearchResults = {
  query: 'news',
  channels: buildChannelHits([a, b], new Map(), NOW),
  programs: [
    {
      channel: a,
      airings: [
        programHit(program('1.id', NOW + 1, NOW + 2), a, NOW, TWELVE_HOUR),
        programHit(program('1.id', NOW + 3, NOW + 4), a, NOW, TWELVE_HOUR),
      ],
    },
    { channel: b, airings: [programHit(program('2.id', NOW + 5, NOW + 6), b, NOW, TWELVE_HOUR)] },
  ],
};
const programsOnly: SearchResults = { ...results, channels: [] };

describe('SearchFocusMemory', () => {
  it('remembers only results nodes, tracks the last Programs node, clears per batch', () => {
    const memory = new SearchFocusMemory();
    const listener = vi.fn();
    memory.subscribe(listener);
    const nodes = resultNodes(results);
    memory.onFocused('search-query', nodes);
    expect(memory.snapshot()).toEqual({ remembered: null, programs: null });
    memory.onFocused(masterCardId(2), nodes);
    expect(memory.snapshot().programs).toEqual({ kind: 'MasterCard', channelId: 2 });
    memory.onFocused(channelCardId(1), nodes);
    expect(memory.snapshot()).toEqual({
      remembered: { kind: 'ChannelCard', channelId: 1 },
      programs: { kind: 'MasterCard', channelId: 2 },
    });
    memory.onFocused(airingRowId(1, NOW + 3), nodes);
    expect(memory.snapshot().programs).toEqual({ kind: 'AiringRow', channelId: 1, startMs: NOW + 3 });
    memory.clear();
    memory.clear();
    expect(memory.snapshot()).toEqual({ remembered: null, programs: null });
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it('lands DOWN on the remembered node, else the first card, else the selected channel first airing', () => {
    expect(downTarget({ kind: 'ChannelCard', channelId: 2 }, results, null)).toBe(channelCardId(2));
    expect(downTarget({ kind: 'ChannelCard', channelId: 9 }, results, null)).toBe(channelCardId(1));
    expect(downTarget(null, programsOnly, null)).toBe(airingRowId(1, NOW + 1));
    expect(downTarget(null, programsOnly, 2)).toBe(airingRowId(2, NOW + 5));
    expect(downTarget(null, { query: '', channels: [], programs: [] }, null)).toBeNull();
    expect(nodeId({ kind: 'AiringRow', channelId: 1, startMs: 5 })).toBe(airingRowId(1, 5));
  });

  it('resolves the selection from the last Programs node, falling back to first channel / first airing', () => {
    expect(resolveSelection(results, null)).toMatchObject({
      selected: { channel: a },
      focused: { program: { startMs: NOW + 1 } },
    });
    expect(resolveSelection(results, { kind: 'MasterCard', channelId: 2 })).toMatchObject({
      selected: { channel: b },
      focused: { program: { startMs: NOW + 5 } },
    });
    expect(
      resolveSelection(results, { kind: 'AiringRow', channelId: 1, startMs: NOW + 3 }).focused?.program
        .startMs,
    ).toBe(NOW + 3);
    expect(resolveSelection(results, { kind: 'MasterCard', channelId: 7 }).selected?.channel).toBe(a);
    expect(resolveSelection({ ...results, programs: [] }, null)).toEqual({ selected: null, focused: null });
  });
});
