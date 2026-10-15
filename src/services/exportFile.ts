import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { ShareResult } from './share';

/** Writes `json` to a cache file and opens the share sheet so the user can save it anywhere. */
export async function shareJsonFile(fileName: string, json: string, dialogTitle: string): Promise<ShareResult> {
  try {
    if (!(await Sharing.isAvailableAsync())) return 'unavailable';
    const file = new File(Paths.cache, fileName);
    if (file.exists) file.delete();
    file.create();
    file.write(json);
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle, UTI: 'public.json' });
    return 'shared';
  } catch {
    return 'failed';
  }
}
