import * as Font from 'expo-font';
import { useEffect, useState } from 'react';

import { useFontStatus } from '@/store/fonts';
import { FONT_FAMILIES, type MyanmarFont } from '@/theme/typography';

const FONT_SOURCES: Record<MyanmarFont, Record<string, number>> = {
  noto: {
    [FONT_FAMILIES.notoRegular]: require('../../assets/fonts/NotoSansMyanmar_400Regular.ttf'),
    [FONT_FAMILIES.notoBold]: require('../../assets/fonts/NotoSansMyanmar_700Bold.ttf'),
  },
  padauk: {
    [FONT_FAMILIES.padaukRegular]: require('../../assets/fonts/Padauk_400Regular.ttf'),
    [FONT_FAMILIES.padaukBold]: require('../../assets/fonts/Padauk_700Bold.ttf'),
  },
};

/**
 * Loads the bundled Myanmar fonts. Each family loads independently so that if
 * one fails (corrupt asset, low storage) the other is used as the fallback.
 * Fonts are loaded at runtime (not embedded via the config plugin) so the
 * family names are identical on Android and iOS.
 */
export function useAppFonts(): boolean {
  const [done, setDone] = useState(false);
  const setAvailable = useFontStatus((s) => s.setAvailable);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.allSettled(
        (Object.keys(FONT_SOURCES) as MyanmarFont[]).map(async (font) => {
          await Font.loadAsync(FONT_SOURCES[font]);
          return font;
        }),
      );
      if (cancelled) return;
      setAvailable(results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : [])));
      setDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [setAvailable]);

  return done;
}
