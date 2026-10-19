import { DarkTheme, SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { I18nextProvider } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components';
import { useAppFonts } from '@/hooks/useAppFonts';
import { useCloudSync } from '@/hooks/useCloudSync';
import { useLanguage } from '@/hooks/useLanguage';
import { useReminders } from '@/hooks/useReminders';
import { useSettingsHydrated } from '@/hooks/useSettingsHydrated';
import { i18n, initI18n } from '@/i18n';
import { adMobService } from '@/ads/admob';
import { useDaily } from '@/store/daily';
import { revenueCatService } from '@/premium/revenuecat';
import { ensureAdsService, useAds } from '@/store/ads';
import { ensurePurchasesService, usePremium } from '@/store/premium';
import { ensureSyncServices } from '@/store/sync';
import { supabaseServices } from '@/sync/supabase';
import { useJournal } from '@/store/journal';
import { palette } from '@/theme/colors';
import { AppThemeProvider, useAppTheme } from '@/theme/ThemeContext';
import { logError } from '@/utils/log';

void SplashScreen.preventAutoHideAsync();
// Cloud backup services exist only in builds configured for it (see src/config/sync.ts).
ensureSyncServices(supabaseServices);
// In-app purchases exist only in builds with a RevenueCat key (see src/config/purchases.ts).
ensurePurchasesService(revenueCatService);
// Ads exist only in builds with ENABLE_ADS=true (see src/config/ads.ts).
ensureAdsService(adMobService);

export default function RootLayout() {
  const fontsReady = useAppFonts();
  const hydrated = useSettingsHydrated();
  const language = useLanguage();

  // Initialise synchronously on first render so no frame shows raw keys.
  initI18n(language);
  useEffect(() => {
    if (i18n.language !== language) void i18n.changeLanguage(language);
  }, [language]);

  const ready = fontsReady && hydrated;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // The native splash screen covers this until fonts and settings are ready.
  if (!ready) return <View style={{ flex: 1, backgroundColor: palette.indigo }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18n}>
          <AppThemeProvider>
            <Navigation />
            <AppServices />
            <ToastHost />
          </AppThemeProvider>
        </I18nextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Root error boundary (expo-router): shown instead of a blank crash. Uses plain views because the
 * theme provider may be what failed. */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  useEffect(() => logError('root.boundary', error), [error]);
  return (
    <View style={{ flex: 1, backgroundColor: palette.indigo, justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text accessibilityRole="header" style={{ color: palette.ivory, fontSize: 22, fontWeight: '600' }}>
        {i18n.t('common.errorTitle')}
      </Text>
      <Text style={{ color: palette.ivoryDeep, fontSize: 16, lineHeight: 24 }}>{i18n.t('common.errorBody')}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void retry()}
        style={{ backgroundColor: palette.gold, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 }}
      >
        <Text style={{ color: palette.indigo, fontSize: 16, fontWeight: '600' }}>{i18n.t('common.errorRetry')}</Text>
      </Pressable>
    </View>
  );
}

/** Background work: load the journal and today's card, keep reminders and cloud backup current. */
function AppServices() {
  useEffect(() => {
    void useJournal.getState().refresh().catch((e) => logError('journal.refresh', e));
    void useDaily.getState().load().catch((e) => logError('daily.load', e));
    // Premium status first, so a subscriber never sees a banner flash up while consent loads.
    void usePremium
      .getState()
      .init()
      .finally(() => void useAds.getState().init());
  }, []);
  useReminders(true);
  useCloudSync();
  return null;
}

function Navigation() {
  const { colors } = useAppTheme();
  const navTheme = useMemo(() => {
    const base = DarkTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.tabBar,
        text: colors.text,
        primary: colors.primary,
        border: colors.border,
      },
    };
  }, [colors]);

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="card/[id]" />
        <Stack.Screen name="reading/[spreadId]" />
        <Stack.Screen name="journal/[id]" />
        <Stack.Screen name="daily" />
        <Stack.Screen name="sign" />
        <Stack.Screen name="birth-chart" />
        <Stack.Screen name="learn/[id]" />
        <Stack.Screen name="about" />
        <Stack.Screen name="legal/[doc]" />
        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
