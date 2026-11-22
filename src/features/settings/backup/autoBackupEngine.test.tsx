import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { SettingsContext } from '@/core/settings/settingsContext';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import {
  autoBackupState,
  createAutoBackupEngine,
  startAutoBackup,
  useAutoBackupStatus,
  useConfigAutoBackup,
} from './autoBackupEngine';
import type { ConfigAutoBackup } from './configAutoBackup';

describe('auto-backup engine', () => {
  afterEach(() => vi.restoreAllMocks());

  it('triggers on settings writes and stops cleanly', () => {
    const settings = new SettingsRepository(new MemoryKeyValueStore());
    const trigger = vi.fn();
    const cancel = vi.fn();
    const engine = { trigger, cancel } as unknown as ConfigAutoBackup;
    const stop = startAutoBackup(settings, engine);
    settings.set(TellySettings.CONFIRM_EXIT, true);
    expect(trigger).toHaveBeenCalled();
    stop();
    expect(cancel).toHaveBeenCalled();
    const real = createAutoBackupEngine(settings);
    expect(real.state.kind).toBe('Idle');
  });

  it('mounts one shared engine for any number of hooks and exposes the status', () => {
    const settings = new SettingsRepository(new MemoryKeyValueStore());
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SettingsContext value={settings}>{children}</SettingsContext>
    );
    const a = renderHook(() => useConfigAutoBackup(), { wrapper });
    const b = renderHook(() => useConfigAutoBackup(), { wrapper });
    const status = renderHook(() => useAutoBackupStatus());
    act(() => autoBackupState().recordExport(5, 'h'));
    expect(status.result.current.lastExportMs).toBe(5);
    a.unmount();
    b.unmount();
    status.unmount();
  });
});
