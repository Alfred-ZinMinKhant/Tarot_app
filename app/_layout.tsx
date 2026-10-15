import { DarkTheme, DefaultTheme, SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { I18nextProvider } from 'react-i18next';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppFonts } from '@/hooks/useAppFonts';
import { useLanguage } from '@/hooks/useLanguage';
import { useSettingsHydrated } from '@/hooks/useSettingsHydrated';
import { i18n, initI18n } from '@/i18n';
import { palette } from '@/theme/colors';
import { AppThemeProvider, useAppTheme } from '@/theme/ThemeContext';

void SplashScreen.preventAutoHideAsync();

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
          </AppThemeProvider>
        </I18nextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Navigation() {
  const { scheme, colors } = useAppTheme();
  const navTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
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
  }, [scheme, colors]);

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="card/[id]" />
      </Stack>
    </ThemeProvider>
  );
}
