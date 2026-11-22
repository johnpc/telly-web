import { describe, expect, it } from 'vitest';
import { AutoBackupState, KEY_LAST_MS, autoBackupSummary } from './autoBackupState';

describe('AutoBackupState', () => {
  it('reads the last export back from storage and notifies on record', () => {
    const map = new Map<string, string>([[KEY_LAST_MS, '1000']]);
    const state = new AutoBackupState({
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
    });
    expect(state.status).toEqual({ lastExportMs: 1000 });
    expect(state.lastHash).toBeNull();
    let notified = 0;
    const stop = state.subscribe(() => (notified += 1));
    state.recordExport(2000, 'abc');
    expect(state.status.lastExportMs).toBe(2000);
    expect(state.lastHash).toBe('abc');
    expect(notified).toBe(1);
    stop();
    state.recordExport(3000, 'def');
    expect(notified).toBe(1);
  });

  it('words the row summary', () => {
    expect(autoBackupSummary({ lastExportMs: null })).toBe('Backs up to browser storage on every change');
    expect(autoBackupSummary({ lastExportMs: Date.UTC(2026, 10, 22, 12, 5) })).toMatch(
      /^Last backup Nov 2\d, \d\d:\d\d · browser storage$/,
    );
  });
});
