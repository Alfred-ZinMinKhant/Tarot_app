import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

import { adsConfig } from '@/config/ads';
import { useShowAds } from '@/store/ads';
import { spacing } from '@/theme/spacing';

/** An adaptive banner at the end of a screen. Renders nothing without ads or for Premium. */
export function AdBanner() {
  const show = useShowAds();
  const unit = __DEV__ ? TestIds.ADAPTIVE_BANNER : adsConfig()?.banner;
  if (!show || !unit) return null;
  return (
    <View style={styles.root} testID="ad-banner">
      <BannerAd unitId={unit} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', marginTop: spacing.md },
});
