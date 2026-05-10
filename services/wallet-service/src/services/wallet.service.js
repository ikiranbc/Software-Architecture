/**
 * Service Layer (Application Service / Use-Case Interactor pattern):
 * - Implements business rules and orchestration.
 * - Coordinates repositories, policies, and external integrations.
 */

import { httpError } from "@hotel-booking/shared-utils";
import {
  createTransaction,
  findOrCreateWallet,
  findTransactionByIdempotencyKey,
  findTransactionsByWalletId,
  findWalletById
} from "../repositories/wallet.repository.js";

function bookingServiceBaseUrls() {
  const configured = process.env.BOOKING_SERVICE_URL;
  return [...new Set([configured, "http://booking-service:4004", "http://localhost:4004"].filter(Boolean))];
}

function isNetworkFetchError(error) {
  const message = String(error?.message || "");
  return error?.name === "TypeError" && /fetch failed|enotfound|econnrefused|ehostunreach|econnreset/i.test(message.toLowerCase());
}

async function bookingServiceRequest(path, options = {}) {
  let lastNetworkError = null;

  for (const baseUrl of bookingServiceBaseUrls()) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
        ...options
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Booking service request failed");
      }
      return payload;
    } catch (error) {
      if (isNetworkFetchError(error)) {
        lastNetworkError = error;
        continue;
      }
      throw error;
    }
  }

  if (lastNetworkError) {
    throw new Error("Booking service is unreachable");
  }
  throw new Error("Booking service request failed");
}

function toIdString(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value.toString === "function") return value.toString();
  return null;
}

function serializeWallet(wallet) {
  if (!wallet) {
    return {
      id: null,
      userId: null,
      balance: 0,
      currency: "USD",
      version: 0,
      updatedAt: null
    };
  }
  return {
    id: toIdString(wallet?._id),
    userId: toIdString(wallet?.userId),
    balance: wallet.balance,
    currency: wallet.currency,
    version: wallet.version,
    updatedAt: wallet.updatedAt
  };
}

function serializeTransaction(transaction) {
  if (!transaction) {
    return {
      id: null,
      walletId: null,
      bookingId: null,
      type: null,
      amount: 0,
      status: "FAILED",
      reference: null,
      idempotencyKey: null,
      metadata: {},
      createdAt: null
    };
  }
  return {
    id: toIdString(transaction?._id),
    walletId: toIdString(transaction?.walletId),
    bookingId: toIdString(transaction?.bookingId),
    type: transaction.type,
    amount: transaction.amount,
    status: transaction.status,
    reference: transaction.reference,
    idempotencyKey: transaction.idempotencyKey,
    metadata: transaction.metadata,
    createdAt: transaction.createdAt
  };
}

export async function topUpWallet(user, payload) {
  const existing = await findTransactionByIdempotencyKey(payload.idempotencyKey);
  if (existing) {
    const wallet = await findWalletById(existing.walletId);
    return {
      statusCode: 200,
      payload: {
        wallet: serializeWallet(wallet),
        transaction: serializeTransaction(existing)
      }
    };
  }

  const wallet = await findOrCreateWallet(user.id);
  wallet.balance += payload.amount;
  wallet.version += 1;
  await wallet.save();

  const transaction = await createTransaction({
    walletId: wallet._id,
    type: "TOP_UP",
    amount: payload.amount,
    reference: `topup:${user.id}:${payload.idempotencyKey}`,
    idempotencyKey: payload.idempotencyKey,
    metadata: { source: "internal-wallet" }
  });

  return {
    statusCode: 201,
    payload: {
      wallet: serializeWallet(wallet),
      transaction: serializeTransaction(transaction)
    }
  };
}

export async function getWalletBalance(user) {
  const wallet = await findOrCreateWallet(user.id);
  return serializeWallet(wallet);
}

export async function listWalletTransactions(user) {
  const wallet = await findOrCreateWallet(user.id);
  const transactions = await findTransactionsByWalletId(wallet._id);
  return { data: transactions.map(serializeTransaction) };
}

export async function proceedBookingPayment(user, bookingId) {
  const booking = await bookingServiceRequest(`/internal/bookings/${bookingId}`);

  if (booking.userId !== user.id) {
    throw httpError(403, "You can only pay for your own booking", "FORBIDDEN");
  }

  if (booking.status === "CONFIRMED" && booking.paymentStatus === "SUCCESS") {
    return {
      statusCode: 200,
      payload: {
        bookingId,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        message: "Booking is already paid and confirmed"
      }
    };
  }

  if (booking.status !== "PENDING_PAYMENT") {
    throw httpError(400, "Only pending bookings can proceed to payment", "INVALID_STATUS");
  }

  const wallet = await findOrCreateWallet(user.id);
  if (wallet.balance < booking.totalAmount) {
    await bookingServiceRequest(`/internal/bookings/${bookingId}/mark-failed`, {
      method: "POST",
      body: JSON.stringify({ reasonCode: "INSUFFICIENT_BALANCE" })
    }).catch(() => undefined);
    throw httpError(402, "Insufficient wallet balance", "INSUFFICIENT_BALANCE");
  }

  await bookingServiceRequest(`/internal/bookings/${bookingId}/mark-processing`, {
    method: "POST",
    body: JSON.stringify({ userId: user.id })
  });

  try {
    await bookingServiceRequest(`/internal/bookings/${bookingId}/emit-booking-created`, {
      method: "POST"
    });
  } catch (error) {
    await bookingServiceRequest(`/internal/bookings/${bookingId}/mark-failed`, {
      method: "POST",
      body: JSON.stringify({ reasonCode: "PAYMENT_EVENT_EMIT_FAILED" })
    }).catch(() => undefined);
    throw error;
  }

  return {
    statusCode: 202,
    payload: {
      bookingId,
      status: "PENDING_PAYMENT",
      paymentStatus: "PROCESSING",
      message: "Payment is processing"
    }
  };
}

export { serializeTransaction, serializeWallet };
