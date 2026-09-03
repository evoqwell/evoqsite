import { describe, expect, it, vi } from 'vitest';
import {
  getStorefrontSettings,
  isPaymentMethodAvailable,
  updateStorefrontSettings
} from './storefrontSettings.js';

function queryResult(value) {
  return { lean: async () => value };
}

describe('storefront settings', () => {
  it('keeps card payments enabled when no settings document exists yet', async () => {
    const model = {
      findOne: vi.fn(() => queryResult(null))
    };

    await expect(getStorefrontSettings({ model })).resolves.toEqual({
      cardPaymentsEnabled: true,
      updatedAt: null
    });
  });

  it('returns the persisted card-payment state', async () => {
    const updatedAt = new Date('2026-09-02T12:00:00.000Z');
    const model = {
      findOne: vi.fn(() => queryResult({ cardPaymentsEnabled: false, updatedAt }))
    };

    await expect(getStorefrontSettings({ model })).resolves.toEqual({
      cardPaymentsEnabled: false,
      updatedAt
    });
  });

  it('upserts changes into the singleton settings document', async () => {
    const lean = vi.fn(async () => ({ cardPaymentsEnabled: false, updatedAt: null }));
    const findOneAndUpdate = vi.fn(() => ({ lean }));
    const model = { findOneAndUpdate };

    await expect(
      updateStorefrontSettings({ cardPaymentsEnabled: false }, { model })
    ).resolves.toEqual({ cardPaymentsEnabled: false, updatedAt: null });

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { key: 'storefront' },
      { $set: { cardPaymentsEnabled: false } },
      expect.objectContaining({ new: true, upsert: true, runValidators: true })
    );
  });

  it('checks settings only for card orders', async () => {
    const model = {
      findOne: vi.fn(() => queryResult({ cardPaymentsEnabled: false }))
    };

    await expect(isPaymentMethodAvailable('venmo', { model })).resolves.toBe(true);
    expect(model.findOne).not.toHaveBeenCalled();
    await expect(isPaymentMethodAvailable('card', { model })).resolves.toBe(false);
  });
});
