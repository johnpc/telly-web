import { describe, expect, it, vi } from 'vitest';
import { downloadBackup, pickBackupFile } from './backupFiles';

describe('backup file glue', () => {
  it('downloads the JSON through a temporary anchor', () => {
    const anchor = document.createElement('a');
    const click = vi.spyOn(anchor, 'click').mockImplementation(() => undefined);
    const revoke = vi.fn();
    downloadBackup('{"v":1}', {
      createObjectURL: () => 'blob:x',
      revokeObjectURL: revoke,
      createAnchor: () => anchor,
    });
    expect(anchor.download).toBe('telly-backup.json');
    expect(anchor.href).toBe('blob:x');
    expect(click).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith('blob:x');
  });

  it('resolves the picked file text, null on cancel or an empty pick', async () => {
    const pick = (files: File[] | null, event: 'change' | 'cancel'): Promise<string | null> => {
      const input = document.createElement('input');
      vi.spyOn(input, 'click').mockImplementation(() => {
        if (files !== null) Object.defineProperty(input, 'files', { value: files });
        input.dispatchEvent(new Event(event));
      });
      return pickBackupFile({ createInput: () => input });
    };
    expect(await pick([new File(['{"v":1}'], 'b.json')], 'change')).toBe('{"v":1}');
    expect(await pick([], 'change')).toBeNull();
    expect(await pick(null, 'cancel')).toBeNull();
    const broken = { text: () => Promise.reject(new Error('io')) } as unknown as File;
    expect(await pick([broken], 'change')).toBeNull();
  });

  it('uses the browser DOM by default', () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:y');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    downloadBackup('{}');
    expect(create).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith('blob:y');
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
    void pickBackupFile();
    expect(click).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
