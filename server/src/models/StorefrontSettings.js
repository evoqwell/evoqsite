import mongoose from 'mongoose';

const storefrontSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      default: 'storefront'
    },
    cardPaymentsEnabled: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export const StorefrontSettings = mongoose.model('StorefrontSettings', storefrontSettingsSchema);
