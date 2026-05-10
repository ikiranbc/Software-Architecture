/**
 * Model Layer (Persistence Model / Data Mapper boundary):
 * - Defines database schema, indexes, and persistence constraints.
 * - Isolated from HTTP concerns to keep boundaries clean.
 */

import mongoose from "mongoose";

const hotelSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: String,
    address: String,
    city: { type: String, required: true, index: true },
    country: { type: String, required: true, index: true },
    amenities: [String],
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    approvalStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true
    }
  },
  { timestamps: true }
);

hotelSchema.index({ name: "text", city: "text", country: "text" });

export const Hotel = mongoose.models.Hotel || mongoose.model("Hotel", hotelSchema);
