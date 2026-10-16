import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

import { ImportError, MAX_BACKUP_BYTES } from './importData';

/** Lets the person choose a backup file; resolves to its text, or null if they cancelled. */
export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', 'application/octet-stream'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  const file = new File(asset.uri);
  if ((file.size ?? 0) > MAX_BACKUP_BYTES) throw new ImportError('tooBig');
  return file.text();
}
