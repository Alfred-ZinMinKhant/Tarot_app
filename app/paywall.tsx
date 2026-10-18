import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText, BackButton, Button, Card, Header, Icon, Screen } from '@/components';
import { localPaymentConfig } from '@/config/purchases';
import { getSpread } from '@/engine';
import { useLanguage } from '@/hooks/useLanguage';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import { FREE_SHARES_PER_MONTH } from '@/premium/features';
import type { PremiumPackage } from '@/premium/service';
import { rewardedConfigured, useAds, useRewardedAvailable } from '@/store/ads';
import { purchasesAvailable, usePremium } from '@/store/premium';
import { useToast } from '@/store/toast';
import { MIN_TAP, radius, spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';

const KIND_ORDER = { annual: 0, monthly: 1, lifetime: 2, other: 3 } as const;

/** Premium paywall. `reason` explains what the user tried to open ("spread:love", "share"). */
export default function Paywall() {
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const { t } = useTranslation();
  const lang = useLanguage();
  const fmt = useNumberFormat();
  const { colors } = useAppTheme();
  const toast = useToast((s) => s.show);
  const p = usePremium();
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<'buy' | 'restore' | 'ad' | null>(null);
  const rewardedAvailable = useRewardedAvailable();
  const local = localPaymentConfig();
  const available = purchasesAvailable();

  useEffect(() => {
    if (available) void usePremium.getState().loadPackages();
  }, [available]);

  const packages = [...p.packages].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
  const chosen = packages.find((x) => x.id === selected) ?? packages[0];

  const close = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  const spreadId = reason?.startsWith('spread:') ? reason.slice('spread:'.length) : null;
  const spread = spreadId ? getSpread(spreadId) : undefined;
  const why = spread
    ? t('premium.reasonSpread', { spread: spread[lang].name })
    : reason === 'share'
      ? t('premium.reasonShare', { n: fmt(FREE_SHARES_PER_MONTH) })
      : null;

  const buy = async () => {
    if (!chosen) return;
    setBusy('buy');
    const outcome = await p.purchase(chosen.id);
    setBusy(null);
    if (outcome === 'purchased') {
      toast(t('premium.thanks'));
      close();
    } else if (outcome === 'failed') toast(t('premium.purchaseFailed'));
  };

  /** Watch a rewarded ad to open this one Premium spread without subscribing. */
  const watchAd = async () => {
    if (!spread) return;
    setBusy('ad');
    const outcome = await useAds.getState().watchForSpread(spread.id);
    setBusy(null);
    if (outcome === 'earned') router.replace({ pathname: '/reading/[spreadId]', params: { spreadId: spread.id } });
    else toast(t(outcome === 'closed' ? 'ads.notFinished' : 'ads.unavailable'));
  };

  const restore = async () => {
    setBusy('restore');
    const result = await p.restore();
    setBusy(null);
    if (result === true) {
      toast(t('premium.restored'));
      close();
    } else toast(result === false ? t('premium.nothingToRestore') : t('premium.restoreFailed'));
  };

  // No Premium on sale, but a rewarded ad unlocks this one reading.
  if (!available && !p.isPremium && rewardedConfigured()) {
    return (
      <Screen testID="screen-paywall-ad">
        <BackButton fallback="/home" />
        <Header title={t('ads.unlockTitle')} subtitle={why ?? t('ads.unlockBody')} />
        {spread && rewardedAvailable ? (
          <Button
            label={t('ads.watchToUnlock')}
            onPress={watchAd}
            loading={busy === 'ad'}
            testID="paywall-watch-ad"
          />
        ) : (
          <AppText tone="textMuted" testID="paywall-ad-unavailable">
            {t('ads.unavailable')}
          </AppText>
        )}
      </Screen>
    );
  }

  if (p.isPremium || !available) {
    return (
      <Screen testID="screen-paywall-unlocked">
        <BackButton fallback="/home" />
        <Header title={t('premium.title')} subtitle={p.isPremium ? t('premium.active') : t('premium.allUnlocked')} />
        <Button label={t('common.done')} onPress={close} testID="paywall-done" />
      </Screen>
    );
  }

  return (
    <Screen testID="screen-paywall">
      <BackButton fallback="/home" />
      <View style={styles.hero}>
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Icon name="star" size={28} color={colors.onPrimary} />
        </View>
        <Header title={t('premium.title')} subtitle={t('premium.subtitle')} />
      </View>
      {why ? (
        <AppText tone="accent" testID="paywall-reason">
          {why}
        </AppText>
      ) : null}

      <Card>
        {(['benefitCeltic', 'benefitLove', 'benefitShare', 'benefitNoAds', 'benefitSupport'] as const).map((k) => (
          <View key={k} style={styles.benefit}>
            <Icon name="check" size={20} color={colors.accent} />
            <AppText style={styles.flex}>{t(`premium.${k}`)}</AppText>
          </View>
        ))}
        <AppText variant="caption" tone="textMuted">
          {t('premium.freeForever')}
        </AppText>
      </Card>

      {p.loadingPackages ? (
        <AppText tone="textMuted" center>
          {t('premium.loading')}
        </AppText>
      ) : packages.length ? (
        <View style={styles.packages} accessibilityRole="radiogroup">
          {packages.map((pkg) => (
            <PackageOption
              key={pkg.id}
              pkg={pkg}
              selected={pkg.id === chosen?.id}
              onPress={() => setSelected(pkg.id)}
            />
          ))}
        </View>
      ) : (
        <Card testID="paywall-offline">
          <AppText>{t('premium.pricesUnavailable')}</AppText>
          <Button
            label={t('premium.retry')}
            variant="secondary"
            onPress={() => void p.loadPackages()}
            testID="paywall-retry"
          />
        </Card>
      )}

      {chosen ? (
        <Button
          label={t('premium.continue', { price: chosen.priceString })}
          onPress={buy}
          loading={busy === 'buy'}
          testID="paywall-buy"
        />
      ) : null}
      {spread && rewardedAvailable ? (
        <Button
          label={t('ads.watchToUnlock')}
          variant="secondary"
          onPress={watchAd}
          loading={busy === 'ad'}
          testID="paywall-watch-ad"
        />
      ) : null}
      <Button
        label={t('premium.restore')}
        variant="ghost"
        onPress={restore}
        loading={busy === 'restore'}
        testID="paywall-restore"
      />

      {local ? (
        <Card testID="paywall-local">
          <AppText variant="heading">{t('premium.localTitle')}</AppText>
          <AppText>{t('premium.localBody', { provider: local.name })}</AppText>
          <Button
            label={t('premium.localPay', { provider: local.name })}
            variant="secondary"
            onPress={() => void Linking.openURL(local.url)}
            testID="paywall-local-pay"
          />
          <Button
            label={t('premium.redeem')}
            variant="ghost"
            onPress={() => void p.redeemCode()}
            testID="paywall-redeem"
          />
        </Card>
      ) : null}

      <AppText variant="caption" tone="textMuted">
        {t(Platform.OS === 'ios' ? 'premium.finePrintIos' : 'premium.finePrintAndroid', { hours: fmt(24) })}
      </AppText>
      <View style={styles.links}>
        <Button
          label={t('settings.terms')}
          variant="ghost"
          onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })}
          style={styles.flex}
          testID="paywall-terms"
        />
        <Button
          label={t('settings.privacy')}
          variant="ghost"
          onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })}
          style={styles.flex}
          testID="paywall-privacy"
        />
      </View>
    </Screen>
  );
}

function PackageOption({ pkg, selected, onPress }: { pkg: PremiumPackage; selected: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const label = t(`premium.kind.${pkg.kind}`);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}, ${pkg.priceString}`}
      testID={`paywall-package-${pkg.id}`}
      style={[
        styles.option,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.surfaceAlt : colors.surface,
        },
      ]}
    >
      <View style={styles.flex}>
        <AppText variant="label" bold>
          {label}
        </AppText>
        {pkg.kind === 'annual' ? (
          <AppText variant="caption" tone="accent">
            {t('premium.bestValue')}
          </AppText>
        ) : null}
      </View>
      <AppText variant="label" bold>
        {pkg.priceString}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.md },
  badge: { width: 56, height: 56, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  benefit: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  flex: { flex: 1 },
  packages: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    minHeight: MIN_TAP,
  },
  links: { flexDirection: 'row', gap: spacing.sm },
});
