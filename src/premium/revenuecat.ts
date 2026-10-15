import { Linking, Platform } from 'react-native';
import Purchases, { type CustomerInfo, PACKAGE_TYPE, type PurchasesPackage } from 'react-native-purchases';

import { purchasesConfig } from '@/config/purchases';

import type { PackageKind, PremiumPackage, PurchasesService } from './service';

const KIND: Partial<Record<PACKAGE_TYPE, PackageKind>> = {
  [PACKAGE_TYPE.MONTHLY]: 'monthly',
  [PACKAGE_TYPE.ANNUAL]: 'annual',
  [PACKAGE_TYPE.LIFETIME]: 'lifetime',
};

/** RevenueCat-backed purchases, or null when this build has no RevenueCat key. */
export function revenueCatService(): PurchasesService | null {
  const config = purchasesConfig();
  if (!config) return null;
  Purchases.configure({ apiKey: config.apiKey });
  const active = (info: CustomerInfo) => info.entitlements.active[config.entitlement] !== undefined;
  let cache: PurchasesPackage[] = [];

  return {
    async isPremium() {
      return active(await Purchases.getCustomerInfo());
    },
    async packages() {
      const offerings = await Purchases.getOfferings();
      cache = offerings.current?.availablePackages ?? [];
      return cache.map(
        (p): PremiumPackage => ({
          id: p.identifier,
          kind: KIND[p.packageType] ?? 'other',
          priceString: p.product.priceString,
          title: p.product.title,
        }),
      );
    },
    async purchase(packageId) {
      const pkg = cache.find((p) => p.identifier === packageId);
      if (!pkg) return { outcome: 'failed', premium: false };
      try {
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        const premium = active(customerInfo);
        return { outcome: premium ? 'purchased' : 'failed', premium };
      } catch (e) {
        const cancelled = (e as { userCancelled?: boolean | null }).userCancelled === true;
        return { outcome: cancelled ? 'cancelled' : 'failed', premium: false };
      }
    },
    async restore() {
      return active(await Purchases.restorePurchases());
    },
    async redeemCode() {
      if (Platform.OS === 'ios') await Purchases.presentCodeRedemptionSheet();
      else await Linking.openURL('https://play.google.com/redeem');
    },
    onChange(listener) {
      Purchases.addCustomerInfoUpdateListener((info) => listener(active(info)));
    },
  };
}
