import clips from '@data/portraits.json';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { portraitsBaseUrl } from '@/config/portraits';
import { logError } from '@/utils/log';

const AVAILABLE = new Set<string>(clips as string[]);

/** True when a moving-portrait clip exists for this card and a host is configured. */
export const hasPortrait = (cardId: string): boolean =>
  Platform.OS !== 'web' && AVAILABLE.has(cardId) && portraitsBaseUrl() !== '';

/**
 * The local file for a card's clip, downloading it once on first use (clips are not bundled, which
 * keeps the install small). Null when there is no clip or the download fails.
 */
export async function portraitUri(cardId: string): Promise<string | null> {
  if (!hasPortrait(cardId)) return null;
  try {
    const dir = new Directory(Paths.cache, 'portraits');
    if (!dir.exists) dir.create();
    const file = new File(dir, `${cardId}.mp4`);
    if (file.exists) return file.uri;
    const downloaded = await File.downloadFileAsync(`${portraitsBaseUrl()}/${cardId}.mp4`, file);
    return downloaded.uri;
  } catch (e) {
    logError('portrait.download', e);
    return null;
  }
}
