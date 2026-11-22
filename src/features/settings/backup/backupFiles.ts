import { BACKUP_FILE_NAME, BACKUP_MIME_TYPE } from './settingsBackup';

/** The DOM glue "Back up data" uses: a Blob behind a temporary `<a download>`. */
export interface DownloadDom {
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
  createAnchor: () => HTMLAnchorElement;
}

const browserDownloadDom = (): DownloadDom => ({
  createObjectURL: (blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
  createAnchor: () => document.createElement('a'),
});

/** Offers `json` as a file download named like the Android export. */
export function downloadBackup(json: string, dom: DownloadDom = browserDownloadDom()): void {
  const url = dom.createObjectURL(new Blob([json], { type: BACKUP_MIME_TYPE }));
  const anchor = dom.createAnchor();
  anchor.href = url;
  anchor.download = BACKUP_FILE_NAME;
  anchor.click();
  dom.revokeObjectURL(url);
}

/** The DOM glue "Restore data" uses: a hidden `<input type=file>` opened by the row's OK. */
export interface FilePickerDom {
  createInput: () => HTMLInputElement;
}

const browserPickerDom = (): FilePickerDom => ({ createInput: () => document.createElement('input') });

/** Opens the file chooser; resolves with the chosen file's text, or null when cancelled. */
export function pickBackupFile(dom: FilePickerDom = browserPickerDom()): Promise<string | null> {
  return new Promise((resolve) => {
    const input = dom.createInput();
    input.type = 'file';
    input.accept = `${BACKUP_MIME_TYPE},.json,text/*`;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file === undefined) resolve(null);
      else void file.text().then(resolve, () => resolve(null));
    });
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}
