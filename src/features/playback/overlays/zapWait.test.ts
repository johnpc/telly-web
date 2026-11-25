import { describe, expect, it } from 'vitest';
import { channel } from '../fixtures.test';
import { runwayLabel, zapWaitOf } from './zapWait';

const HELD = { kind: 'Held' } as const;
const EMPTY = { kind: 'Empty' } as const;

describe('zapWait', () => {
  it('is hidden unless the engine is buffering', () => {
    for (const kind of ['Idle', 'Playing', 'Ended'] as const) {
      expect(zapWaitOf({ kind }, { ahead: 1, need: 6 }, EMPTY, channel(1))).toEqual({ kind: 'Hidden' });
    }
    expect(
      zapWaitOf({ kind: 'Reconnecting', attempt: 1, epoch: 1 }, { ahead: 1, need: 6 }, EMPTY, null),
    ).toEqual({
      kind: 'Hidden',
    });
    expect(zapWaitOf({ kind: 'Error', message: 'x' }, { ahead: 1, need: 6 }, HELD, channel(1)).kind).toBe(
      'Hidden',
    );
  });

  it('shows the channel card only when no previous frame is held (first tune)', () => {
    const first = zapWaitOf(
      { kind: 'Buffering' },
      { ahead: 2.6, need: 6 },
      EMPTY,
      channel(1, { name: 'News One' }),
    );
    expect(first).toEqual({
      kind: 'Waiting',
      card: { logoUrl: 'http://x/1.png', name: 'News One' },
      label: 'Buffering · 2 s of 6 s',
      permille: 433,
    });
    const named = zapWaitOf(
      { kind: 'Buffering' },
      { ahead: 0, need: 12 },
      EMPTY,
      channel(2, { customName: 'Mine' }),
    );
    expect(named.kind === 'Waiting' && named.card?.name).toBe('Mine');
    const zap = zapWaitOf({ kind: 'Buffering' }, { ahead: 6, need: 6 }, HELD, channel(1));
    expect(zap).toEqual({ kind: 'Waiting', card: null, label: 'Buffering · 6 s of 6 s', permille: 1000 });
    expect(zapWaitOf({ kind: 'Buffering' }, { ahead: 0, need: 0 }, EMPTY, null)).toEqual({
      kind: 'Waiting',
      card: null,
      label: 'Buffering…',
      permille: 0,
    });
  });

  it('labels whole seconds, clamped to the need, and a bare "Buffering…" before a gate is attached', () => {
    expect(runwayLabel({ ahead: 0, need: 0 })).toBe('Buffering…');
    expect(runwayLabel({ ahead: 3.9, need: 6 })).toBe('Buffering · 3 s of 6 s');
    expect(runwayLabel({ ahead: 14, need: 12 })).toBe('Buffering · 12 s of 12 s');
  });
});
