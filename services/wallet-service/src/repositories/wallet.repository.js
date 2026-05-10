/**
 * Repository Layer (Repository pattern):
 * - Encapsulates data access/query details behind stable methods.
 * - Supports Dependency Inversion by decoupling services from storage specifics.
 */

import { Transaction } from "../models/transaction.model.js";
import { Wallet } from "../models/wallet.model.js";

export function findOrCreateWallet(userId) {
  return Wallet.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, balance: 0, currency: "USD" } },
    { new: true, upsert: true }
  );
}

export function findWalletById(walletId) {
  return Wallet.findById(walletId);
}

export function findWalletByUserId(userId) {
  return Wallet.findOne({ userId });
}

export function findTransactionByIdempotencyKey(idempotencyKey) {
  return Transaction.findOne({ idempotencyKey });
}

export function findTransactionsByWalletId(walletId, limit = 100) {
  return Transaction.find({ walletId }).sort({ createdAt: -1 }).limit(limit);
}

export function createTransaction(payload) {
  return Transaction.create(payload);
}

export function debitWalletIfEnough(userId, amount) {
  return Wallet.findOneAndUpdate(
    { userId, balance: { $gte: amount } },
    { $inc: { balance: -amount, version: 1 } },
    { new: true }
  );
}

export async function creditWallet(userId, amount) {
  const wallet = await findOrCreateWallet(userId);
  wallet.balance += amount;
  wallet.version += 1;
  await wallet.save();
  return wallet;
}
