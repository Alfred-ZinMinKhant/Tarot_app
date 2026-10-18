import { type ReactNode, useRef, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';

import { AdBanner } from './AdBanner';
import { BackToTop } from './BackToTop';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: ViewStyle;
  /** Show a banner ad at the end of the screen (hidden for Premium and in builds without ads). */
  ad?: boolean;
  testID?: string;
};

/** Scrolled further than this (about one screen) and the back-to-top button appears. */
const BACK_TO_TOP_AFTER = 600;

export function Screen({ children, scroll = true, edges = ['top', 'left', 'right'], contentStyle, ad, testID }: Props) {
  const { colors } = useAppTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [showTop, setShowTop] = useState(false);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const far = e.nativeEvent.contentOffset.y > BACK_TO_TOP_AFTER;
    setShowTop((was) => (was === far ? was : far));
  };
  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: colors.background }]} testID={testID}>
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={64}
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
          {ad ? <AdBanner /> : null}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, contentStyle]}>
          {children}
          {ad ? <AdBanner /> : null}
        </View>
      )}
      {scroll && showTop ? <BackToTop onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
});
