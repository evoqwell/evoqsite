import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    priceCents: {
      type: Number,
      required: true,
      min: 0
    },
    image: {
      type: String,
      trim: true
    },
    categories: {
      type: [String],
      default: [],
      set: (value) => {
        if (Array.isArray(value)) {
          return value
            .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
            .filter(Boolean);
        }
        if (typeof value === 'string') {
          return value
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean);
        }
        return [];
      }
    },
    category: {
      type: String,
      trim: true
    },
    coa: {
      type: String,
      trim: true
    },
    stock: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ['active', 'coming_soon', 'inactive'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

productSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    ret.id = ret.sku;
    ret.price = Number((ret.priceCents / 100).toFixed(2));
    if (!Array.isArray(ret.categories) || ret.categories.length === 0) {
      ret.categories = ret.category ? [ret.category] : [];
    }
    if (!ret.category && Array.isArray(ret.categories) && ret.categories.length > 0) {
      ret.category = ret.categories[0];
    }
    delete ret._id;
    delete ret.priceCents;
  }
});

export const Product = mongoose.model('Product', productSchema);
