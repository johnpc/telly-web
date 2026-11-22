import { describe, expect, it } from 'vitest';
import { GuideFocusEngine } from './guideFocusEngine';
import { GuideFocusMemory } from './guideFocusMemory';
import type { GuideRow } from './guideModel';
import { MIN, ORIGIN, channel, row } from './testFixtures';

describe('GuideFocusMemory', () => {
  const rows: GuideRow[] = [
    row(channel(1), ORIGIN, 4),
    row(channel(2), ORIGIN, 4),
    row(channel(3), ORIGIN, 4),
  ];
  function make(): { engine: GuideFocusEngine; memory: GuideFocusMemory; list: GuideRow[] } {
    const list = [...rows];
    const engine = new GuideFocusEngine(
      ORIGIN,
      () => 0,
      () => 7,
    );
    engine.ensureFocus(list, ORIGIN + MIN);
    engine.moveVertical(list, 1);
    engine.moveRight(list);
    return {
      engine,
      memory: new GuideFocusMemory(
        engine,
        () => 7,
        () => list,
      ),
      list,
    };
  }
  it('is Empty without a focused row and Saved after save', () => {
    const { engine, memory, list } = make();
    expect(memory.current).toBe('Empty');
    expect(memory.savedChannelId).toBeNull();
    memory.save();
    expect(memory.current).toBe('Saved');
    expect(memory.savedChannelId).toBe(2);
    engine.reset();
    memory.save();
    expect(memory.current).toBe('Empty');
    list.length = 0;
    memory.restore();
    expect(engine.focus).toBeNull();
  });
  it('re-asserts the snapshot once on the channel wherever it slid to', () => {
    const { engine, memory, list } = make();
    memory.save();
    const saved = engine.focus;
    list.unshift(row(channel(9), ORIGIN, 4));
    engine.ensureFocus(list, ORIGIN);
    expect(list[engine.focus?.rowIndex ?? -1]?.channel.id).toBe(1);
    memory.restore();
    expect(memory.current).toBe('Consumed');
    expect(memory.savedChannelId).toBe(2);
    expect(engine.focus).toEqual({ ...saved, rowIndex: 2 });
    engine.moveVertical(list, -1);
    memory.restore();
    expect(engine.focus?.rowIndex).toBe(1);
  });
  it('keeps the engine fallback when the channel vanished and resolves a changed cell by anchor', () => {
    const { engine, memory, list } = make();
    memory.save();
    list.splice(1, 1);
    engine.ensureFocus(list, ORIGIN);
    memory.restore();
    expect(list[engine.focus?.rowIndex ?? -1]?.channel.id).toBe(3);
    const again = make();
    again.memory.save();
    again.list[1] = row(channel(2), ORIGIN + 30 * MIN, 4);
    again.memory.restore();
    expect(again.engine.focus?.cell.startMs).toBe(ORIGIN + 30 * MIN);
  });
});
