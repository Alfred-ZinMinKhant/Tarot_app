import { ImportError, MAX_BACKUP_BYTES } from './importData';

/** Web: open the browser's file chooser; resolves to the file's text, or null if cancelled. */
export function pickBackupFile(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      if (file.size > MAX_BACKUP_BYTES) return reject(new ImportError('tooBig'));
      file.text().then(resolve, reject);
    };
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}
