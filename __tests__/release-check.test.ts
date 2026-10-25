import { checkRelease } from '../scripts/lib/release-check';

const legal = { PUBLISHER_NAME: 'Zin Min Khant', SUPPORT_EMAIL: 'support@example.com', LEGAL_EFFECTIVE_DATE: '2026-11-01' };
const realAds = {
  ENABLE_ADS: 'true',
  ADMOB_ANDROID_APP_ID: 'ca-app-pub-1234567890123456~1234567890',
  ADMOB_BANNER_ANDROID: 'ca-app-pub-1234567890123456/1111111111',
  ADMOB_REWARDED_ANDROID: 'ca-app-pub-1234567890123456/2222222222',
  ADMOB_INTERSTITIAL_ANDROID: 'ca-app-pub-1234567890123456/3333333333',
};

describe('checkRelease', () => {
  it('passes a free build with real ads and no RevenueCat keys, with a note', () => {
    const r = checkRelease({ ...legal, ...realAds });
    expect(r.errors).toEqual([]);
    expect(r.notes.join(' ')).toMatch(/nobody can remove ads/);
  });

  it('fails when the legal contact is empty', () => {
    const r = checkRelease({ ENABLE_ADS: '' });
    expect(r.errors).toHaveLength(2);
  });

  it('fails when ads are on without the Android IDs', () => {
    const r = checkRelease({ ...legal, ENABLE_ADS: 'true' });
    expect(r.errors.map((e) => e.split(' ')[0])).toEqual([
      'ADMOB_ANDROID_APP_ID',
      'ADMOB_BANNER_ANDROID',
      'ADMOB_REWARDED_ANDROID',
      'ADMOB_INTERSTITIAL_ANDROID',
    ]);
  });

  it("rejects Google's sample IDs", () => {
    const r = checkRelease({
      ...legal,
      ...realAds,
      ADMOB_ANDROID_APP_ID: 'ca-app-pub-3940256099942544~3347511713',
      ADMOB_BANNER_ANDROID: 'ca-app-pub-3940256099942544/6300978111',
    });
    expect(r.errors).toHaveLength(2);
  });

  it('rejects a RevenueCat secret key but accepts the public one', () => {
    expect(checkRelease({ ...legal, REVENUECAT_ANDROID_API_KEY: 'sk_abc' }).errors).toHaveLength(1);
    expect(checkRelease({ ...legal, REVENUECAT_ANDROID_API_KEY: 'goog_abc' }).errors).toEqual([]);
  });

  it('warns about ad IDs when ads are off and about test devices when on', () => {
    expect(checkRelease({ ...legal, ADMOB_BANNER_ANDROID: 'x' }).warnings.join(' ')).toMatch(/no ads/);
    expect(checkRelease({ ...legal, ...realAds, ADMOB_TEST_DEVICES: 'abc' }).warnings.join(' ')).toMatch(/TEST_DEVICES/);
  });
});
