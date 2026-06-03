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

// TTL index: auto-expire raw page-view events so the collection can't grow
// without bound. This caps storage and keeps analytics aggregations fast.
// NOTE: this also bounds the analytics "all" range to the retention window.
// Created automatically on startup via Mongoose autoIndex (no manual migration).
const PAGE_VIEW_RETENTION_SECONDS = 60 * 60 * 24 * 365; // 365 days
pageViewSchema.index({ createdAt: 1 }, { expireAfterSeconds: PAGE_VIEW_RETENTION_SECONDS });

// Compound index for efficient unique visitor queries
pageViewSchema.index({ ipAddress: 1, createdAt: 1, page: 1 });

export const PageView = mongoose.model('PageView', pageViewSchema);
