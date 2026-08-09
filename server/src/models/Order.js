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
    // Only collected when the customer asks to pay by card, so the owner has a
    // number to text the invoice link to. Encrypted at rest like the rest of
    // the customer PII.
    phone: { type: String },
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
    promoCodes: [{ type: String }],
    venmoNote: { type: String },
    // How the customer intends to pay. `card` means they asked to be invoiced
    // separately — the site never charges a card itself.
    paymentMethod: {
      type: String,
      enum: ['venmo', 'card'],
      default: 'venmo'
    },
    // When the owner sent the card customer their invoice link. Null means the
    // customer is still waiting. Only meaningful for `paymentMethod: 'card'`;
    // deliberately NOT a fifth `status` value, which would distort revenue
    // math, the status filter tabs, and the pending-orders badge.
    invoiceSentAt: { type: Date, default: null },
    // When this order's items were subtracted from product stock. Null means
    // the stock is not currently held by this order — either it was released
    // (cancelled) or the order predates inventory tracking. Cancelling and
    // deleting key off this field so a double-cancel can't restock twice, and
    // so legacy orders (where the field is absent) never restock phantom units.
    inventoryDeductedAt: { type: Date, default: null },
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

// Admin orders list sorts by createdAt desc and filters by status.
// A compound index covers both the sort and the filter in one scan.
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

orderSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
  }
});

export const Order = mongoose.model('Order', orderSchema);
