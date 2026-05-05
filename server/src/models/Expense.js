import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true, maxlength: 500 },
    amountCents: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true }
  },
  { timestamps: true }
);

expenseSchema.index({ date: -1 });

expenseSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
  }
});

export const Expense = mongoose.model('Expense', expenseSchema);
