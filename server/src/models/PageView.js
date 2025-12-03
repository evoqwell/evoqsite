import mongoose from 'mongoose';

const pageViewSchema = new mongoose.Schema(
  {
    ipAddress: {
      type: String,
      required: true,
      trim: true
    },
    page: {
      type: String,
      required: true,
      enum: ['homepage', 'products'],
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Index for time-range queries
pageViewSchema.index({ createdAt: -1 });

// Compound index for efficient unique visitor queries
pageViewSchema.index({ ipAddress: 1, createdAt: 1, page: 1 });

export const PageView = mongoose.model('PageView', pageViewSchema);
