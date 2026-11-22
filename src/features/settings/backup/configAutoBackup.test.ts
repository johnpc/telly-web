import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutoBackupState } from './autoBackupState';
import { ConfigAutoBackup, hashOf } from './configAutoBackup';

function storage(): Pick<Storage, 'getItem' | 'setItem'> {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
}

describe('ConfigAutoBackup', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function build(overrides: { enabled?: boolean; json?: string | null; failWrite?: boolean } = {}) {
    const writes: string[] = [];
    const warnings: string[] = [];
    let enabled = overrides.enabled ?? true;
    const state = new AutoBackupState(storage());
    const engine = new ConfigAutoBackup({
      enabled: () => enabled,
      buildJson: async () => (overrides.json === undefined ? '{"a":1}' : overrides.json),
      write: async (json) => {
        if (overrides.failWrite === true) throw new Error('disk');
        writes.push(json);
      },
      state,
      clock: () => 42,
      debounceMs: 100,
      warn: (message) => void warnings.push(message),
    });
    return { engine, writes, warnings, state, setEnabled: (v: boolean) => void (enabled = v) };
  }

  it('debounces a burst of triggers into one export and dedupes by hash', async () => {
    const { engine, writes, state } = build();
    expect(engine.state).toEqual({ kind: 'Idle', hash: null });
    engine.trigger();
    engine.trigger();
    expect(engine.state.kind).toBe('Debouncing');
    await vi.advanceTimersByTimeAsync(100);
    expect(writes).toEqual(['{"a":1}']);
    expect(state.status.lastExportMs).toBe(42);
    expect(state.lastHash).toBe(hashOf('{"a":1}'));
    expect(engine.state).toEqual({ kind: 'Idle', hash: hashOf('{"a":1}') });
    engine.trigger();
    await vi.advanceTimersByTimeAsync(100);
    expect(writes).toHaveLength(1);
  });

  it('stays disabled while the toggle is off and skips empty payloads', async () => {
    const off = build({ enabled: false });
    expect(off.engine.state).toEqual({ kind: 'Disabled' });
    off.engine.trigger();
    await off.engine.exportNow();
    expect(off.writes).toEqual([]);
    off.setEnabled(true);
    off.engine.trigger();
    await vi.advanceTimersByTimeAsync(100);
    expect(off.writes).toHaveLength(1);
    const empty = build({ json: null });
    await empty.engine.exportNow();
    expect(empty.writes).toEqual([]);
    expect(empty.state.lastHash).toBeNull();
  });

  it('swallows write failures, re-arms after a trigger during export, and cancels a pending debounce', async () => {
    const failing = build({ failWrite: true });
    await failing.engine.exportNow();
    expect(failing.warnings).toEqual(['config auto-backup export failed']);
    expect(failing.engine.state.kind).toBe('Idle');
    const { engine, writes } = build();
    const exporting = engine.exportNow();
    expect(engine.state).toEqual({ kind: 'Exporting', retrigger: false });
    engine.trigger();
    expect(engine.state).toEqual({ kind: 'Exporting', retrigger: true });
    await exporting;
    expect(engine.state.kind).toBe('Debouncing');
    engine.cancel();
    expect(engine.state.kind).toBe('Idle');
    await vi.advanceTimersByTimeAsync(200);
    expect(writes).toHaveLength(1);
    const during = build();
    const run = during.engine.exportNow();
    during.engine.cancel();
    expect(during.engine.state.kind).toBe('Exporting');
    await run;
    during.setEnabled(false);
    during.engine.trigger();
    expect(during.engine.state).toEqual({ kind: 'Disabled' });
  });
});
