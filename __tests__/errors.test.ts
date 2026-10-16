import { setPurchasesService, usePremium } from '@/store/premium';
import type { PurchasesService } from '@/premium/service';
import { logError, setErrorSink } from '@/utils/log';

afterEach(() => {
  setErrorSink(null);
  setPurchasesService(undefined);
  jest.restoreAllMocks();
});

describe('logError', () => {
  it('forwards the scope and cause to the sink', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sink = jest.fn();
    setErrorSink(sink);
    const cause = new Error('boom');
    logError('test.scope', cause);
    expect(sink).toHaveBeenCalledWith('test.scope', cause);
  });
});

describe('premium purchase failure', () => {
  it('returns "failed" and logs when the store throws', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sink = jest.fn();
    setErrorSink(sink);
    setPurchasesService({
      purchase: jest.fn().mockRejectedValue(new Error('store down')),
    } as unknown as PurchasesService);

    await expect(usePremium.getState().purchase('monthly')).resolves.toBe('failed');
    expect(sink).toHaveBeenCalledWith('premium.purchase', expect.any(Error));
    expect(usePremium.getState().isPremium).toBe(false);
  });
});
