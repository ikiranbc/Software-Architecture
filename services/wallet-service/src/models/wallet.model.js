/**
 * Model Layer (Persistence Model / Data Mapper boundary):
 * - Defines database schema, indexes, and persistence constraints.
 * - Isolated from HTTP concerns to keep boundaries clean.
 */

import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
    balance: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "USD" },
    version: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Wallet = mongoose.models.Wallet || mongoose.model("Wallet", walletSchema);
