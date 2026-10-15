import type { PremiumPackage, PurchaseOutcome, PurchasesService } from '@/premium/service';

/** Scriptable stand-in for RevenueCat. */
export class FakePurchases implements PurchasesService {
  premium = false;
  /** What the store would have on record for "Restore purchases". */
  owned = false;
  offline = false;
  nextOutcome: PurchaseOutcome = 'purchased';
  redeemed = 0;
  listeners: ((premium: boolean) => void)[] = [];
  list: PremiumPackage[] = [
    { id: '$rc_monthly', kind: 'monthly', priceString: '4,900 Ks', title: 'Monthly' },
    { id: '$rc_lifetime', kind: 'lifetime', priceString: '39,000 Ks', title: 'Lifetime' },
    { id: '$rc_annual', kind: 'annual', priceString: '29,000 Ks', title: 'Yearly' },
  ];
  async isPremium() {
    return this.premium;
  }
  async packages() {
    if (this.offline) throw new Error('offline');
    return this.list;
  }
  async purchase(_id: string) {
    if (this.nextOutcome === 'purchased') {
      this.premium = true;
      this.owned = true;
    }
    return { outcome: this.nextOutcome, premium: this.premium };
  }
  async restore() {
    if (this.offline) throw new Error('offline');
    this.premium = this.owned;
    return this.premium;
  }
  async redeemCode() {
    this.redeemed++;
  }
  onChange(listener: (premium: boolean) => void) {
    this.listeners.push(listener);
  }
}
