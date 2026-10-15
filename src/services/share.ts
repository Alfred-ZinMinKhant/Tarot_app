import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Platform, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

export type ShareResult = 'shared' | 'unavailable' | 'failed';

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
