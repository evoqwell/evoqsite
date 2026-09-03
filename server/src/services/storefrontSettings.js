import { StorefrontSettings } from '../models/StorefrontSettings.js';

const SETTINGS_KEY = 'storefront';

function serializeSettings(settings) {
  return {
    cardPaymentsEnabled: settings?.cardPaymentsEnabled ?? true,
    updatedAt: settings?.updatedAt ?? null
  };
}

export async function getStorefrontSettings({ model = StorefrontSettings } = {}) {
  const settings = await model.findOne({ key: SETTINGS_KEY }).lean();
  return serializeSettings(settings);
}

export async function updateStorefrontSettings(
  { cardPaymentsEnabled },
  { model = StorefrontSettings } = {}
) {
  const settings = await model
    .findOneAndUpdate(
      { key: SETTINGS_KEY },
      { $set: { cardPaymentsEnabled } },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    )
    .lean();

  return serializeSettings(settings);
}

export async function isPaymentMethodAvailable(
  paymentMethod,
  options
) {
  if (paymentMethod !== 'card') return true;
  const settings = await getStorefrontSettings(options);
  return settings.cardPaymentsEnabled;
}
