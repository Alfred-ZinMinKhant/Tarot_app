import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Platform, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

export type ShareResult = 'shared' | 'unavailable' | 'failed';
export type SaveResult = 'saved' | 'denied' | 'unavailable' | 'failed';

/** Renders a view to a PNG and opens the system share sheet. */
export async function shareViewAsImage(view: RefObject<View | null>, dialogTitle: string): Promise<ShareResult> {
  try {
    if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync()) || !view.current) return 'unavailable';
    const uri = await captureRef(view, { format: 'png', quality: 1, result: 'tmpfile' });
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle, UTI: 'public.png' });
    return 'shared';
  } catch {
    return 'failed';
  }
}

/** Renders a view to a PNG and saves it to the photo library (write-only access). */
export async function saveViewToPhotos(view: RefObject<View | null>): Promise<SaveResult> {
  try {
    if (Platform.OS === 'web' || !view.current) return 'unavailable';
    const { granted } = await MediaLibrary.requestPermissionsAsync(true);
    if (!granted) return 'denied';
    const uri = await captureRef(view, { format: 'png', quality: 1, result: 'tmpfile' });
    await MediaLibrary.saveToLibraryAsync(uri);
    return 'saved';
  } catch {
    return 'failed';
  }
}
