import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components';
import { LINE_HEIGHT, fontFamilyFor } from '@/theme/typography';
import { useAppTheme } from '@/theme/ThemeContext';

const TABS: { name: string; icon: IconName; labelKey: 'home' | 'library' | 'journal' | 'learn' | 'settings' }[] = [
  { name: 'home', icon: 'home', labelKey: 'home' },
  { name: 'library', icon: 'cards', labelKey: 'library' },
  { name: 'journal', icon: 'journal', labelKey: 'journal' },
  { name: 'learn', icon: 'learn', labelKey: 'learn' },
  { name: 'settings', icon: 'settings', labelKey: 'settings' },
];

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors, language, myanmarFont } = useAppTheme();
  const insets = useSafeAreaInsets();
  const script = language === 'my' ? 'myanmar' : 'latin';
  const labelSize = 11;
  const labelLineHeight = Math.round(labelSize * LINE_HEIGHT[script]);
  // Icon container (28) + label line + vertical padding (12) + item spacing (18).
  // The default bar height clips the label, especially stacked Burmese glyphs.
  const barHeight = 28 + labelLineHeight + 30 + insets.bottom;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          height: barHeight,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamilyFor(script, false, myanmarFont),
          fontSize: labelSize,
          lineHeight: labelLineHeight,
        },
        // Tab labels sit in a fixed-height bar; cap scaling so they never clip.
        tabBarAllowFontScaling: false,
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(`tabs.${tab.labelKey}`),
            tabBarAccessibilityLabel: t(`tabs.${tab.labelKey}`),
            tabBarButtonTestID: `tab-${tab.name}`,
            tabBarIcon: ({ color, size }) => <Icon name={tab.icon} color={color} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
