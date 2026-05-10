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
