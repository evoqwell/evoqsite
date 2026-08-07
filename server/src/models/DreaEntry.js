import mongoose from 'mongoose';

// Ledger for the owner's wife's hairstyling business. Deliberately stored in
// its own collection rather than as a flag on Expense: nothing here may ever
// leak into EVOQ revenue, expenses, or analytics.
const dreaEntrySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['income', 'expense'], required: true },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    // Always positive. The sign is implied by `type`.
    amountCents: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true }
  },
  { timestamps: true }
);

dreaEntrySchema.index({ date: -1 });
dreaEntrySchema.index({ type: 1, date: -1 });

dreaEntrySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
  }
});

export const DreaEntry = mongoose.model('DreaEntry', dreaEntrySchema);
