/**
 * Controller Layer (MVC / Interface Adapter pattern):
 * - Translates HTTP input/output for the application boundary.
 * - Delegates business decisions to services (Single Responsibility Principle).
 */

import * as walletService from "../services/wallet.service.js";

export async function topUp(req, res) {
  const { statusCode, payload } = await walletService.topUpWallet(req.user, req.body);
  res.status(statusCode).json(payload);
}

export async function getBalance(req, res) {
  const payload = await walletService.getWalletBalance(req.user);
  res.json(payload);
}

export async function getTransactions(req, res) {
  const payload = await walletService.listWalletTransactions(req.user);
  res.json(payload);
}

export async function proceedPayment(req, res) {
  const { statusCode, payload } = await walletService.proceedBookingPayment(req.user, req.params.bookingId);
  res.status(statusCode).json(payload);
}
