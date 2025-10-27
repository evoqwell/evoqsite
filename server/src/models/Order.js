import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true },
    name: { type: String, required: true },
    priceCents: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    lineTotalCents: { type: Number, required: true }
  },
  { _id: false }
);

const totalsSchema = new mongoose.Schema(
  {
    subtotalCents: { type: Number, required: true },
    discountCents: { type: Number, required: true },
    shippingCents: { type: Number, required: true },
    totalCents: { type: Number, required: true }
  },
  { _id: false }
);

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true
    },
    status: {
      type: String,
      enum: ['pending_payment', 'paid', 'fulfilled', 'cancelled'],
      default: 'pending_payment'
    },
    promoCode: { type: String },
    venmoNote: { type: String },
    items: {
      type: [orderItemSchema],
      validate: [(val) => Array.isArray(val) && val.length > 0, 'Order must have at least one item.']
    },
    totals: {
      type: totalsSchema,
      required: true
    },
    customer: {
      type: customerSchema,
      required: true
    }
  },
  {
    timestamps: true
  }
);

orderSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
  }
});

export const Order = mongoose.model('Order', orderSchema);
