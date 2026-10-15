export type PackageKind = 'monthly' | 'annual' | 'lifetime' | 'other';

/** A purchasable option, with the price string already localised by the store. */
export type PremiumPackage = { id: string; kind: PackageKind; priceString: string; title: string };

export type PurchaseOutcome = 'purchased' | 'cancelled' | 'failed';

export interface PurchasesService {
  /** Whether the user currently has the Premium entitlement (works offline from the store cache). */
  isPremium(): Promise<boolean>;
  packages(): Promise<PremiumPackage[]>;
  purchase(packageId: string): Promise<{ outcome: PurchaseOutcome; premium: boolean }>;
  restore(): Promise<boolean>;
  /** iOS: Apple's offer-code sheet. Android: Google Play's redeem page. */
  redeemCode(): Promise<void>;
  /** Calls back whenever the entitlement changes (renewal, expiry, purchase on another device). */
  onChange(listener: (premium: boolean) => void): void;
}
