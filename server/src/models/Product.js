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
    category: {
      type: String,
      trim: true
    },
    stock: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
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
    delete ret._id;
    delete ret.priceCents;
    delete ret.isActive;
  }
});

export const Product = mongoose.model('Product', productSchema);
