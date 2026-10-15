import type { PurchasesService } from './service';

/** No in-app purchases in the web preview: everything is unlocked there. */
export function revenueCatService(): PurchasesService | null {
  return null;
}
