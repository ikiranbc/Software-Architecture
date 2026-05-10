/**
 * Model Layer (Persistence Model / Data Mapper boundary):
 * - Defines database schema, indexes, and persistence constraints.
 * - Isolated from HTTP concerns to keep boundaries clean.
 */

import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    walletId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, index: true },
    type: { type: String, enum: ["TOP_UP", "DEBIT", "CREDIT", "REFUND"], required: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["PENDING", "SUCCESS", "FAILED"], default: "SUCCESS" },
    reference: { type: String, required: true, unique: true },
    idempotencyKey: { type: String, required: true, unique: true },
    metadata: mongoose.Schema.Types.Mixed
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Transaction = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
