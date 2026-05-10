/**
 * Service Layer (Application Service / Use-Case Interactor pattern):
 * - Implements business rules and orchestration.
 * - Coordinates repositories, policies, and external integrations.
 */

import { publishEvent } from "@hotel-booking/shared-utils";
import {
  bookingCreatedSchema,
  EventTypes,
  makeEvent
} from "@hotel-booking/event-contracts";
import {
  createTransaction,
  creditWallet,
  debitWalletIfEnough,
  findTransactionByIdempotencyKey,
  findOrCreateWallet
} from "../repositories/wallet.repository.js";

let rabbitChannel;

export function setPaymentEventChannel(channel) {
  rabbitChannel = channel;
}

class InsufficientBalanceError extends Error {
  constructor() {
    super("Insufficient wallet balance");
    this.name = "InsufficientBalanceError";
  }
}

export function bullConnection() {
  const url = new URL(process.env.REDIS_URL || "redis://localhost:6379");
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    maxRetriesPerRequest: null
  };
}

function paymentKeys(event) {
  return {
    debit: `${event.idempotencyKey}:debit`,
    credit: `${event.idempotencyKey}:credit`,
    refund: `${event.idempotencyKey}:refund`
  };
}

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

async function emitPaymentSuccess(event, transactionIds) {
  await publishEvent(
    rabbitChannel,
    EventTypes.PAYMENT_SUCCESS,
    makeEvent(EventTypes.PAYMENT_SUCCESS, {
      bookingId: event.bookingId,
      transactionIds,
      idempotencyKey: event.idempotencyKey
    })
  );
}

async function emitPaymentFailed(event, reasonCode, retryable = false) {
  await publishEvent(
    rabbitChannel,
    EventTypes.PAYMENT_FAILED,
    makeEvent(EventTypes.PAYMENT_FAILED, {
      bookingId: event.bookingId,
      reasonCode,
      retryable,
      idempotencyKey: event.idempotencyKey
    })
  );
}

async function getPaymentState(keys) {
  const [debit, credit, refund] = await Promise.all([
    findTransactionByIdempotencyKey(keys.debit),
    findTransactionByIdempotencyKey(keys.credit),
    findTransactionByIdempotencyKey(keys.refund)
  ]);
  return { debit, credit, refund };
}

async function ensureGuestDebit(event, keys, priorDebit) {
  if (priorDebit) return priorDebit;

  const guestWallet = await debitWalletIfEnough(event.userId, event.amount);
  if (!guestWallet) throw new InsufficientBalanceError();

  try {
    const transaction = await createTransaction({
      walletId: guestWallet._id,
      bookingId: event.bookingId,
      type: "DEBIT",
      amount: event.amount,
      reference: `booking:${event.bookingId}:debit`,
      idempotencyKey: keys.debit,
      metadata: { eventId: event.eventId }
    });
    return transaction;
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const transaction = await findTransactionByIdempotencyKey(keys.debit);
    if (!transaction) throw error;
    return transaction;
  }
}

async function ensureOwnerCredit(event, keys, priorCredit) {
  if (priorCredit) return priorCredit;

  const ownerWallet = await creditWallet(event.ownerId, event.amount);
  try {
    const transaction = await createTransaction({
      walletId: ownerWallet._id,
      bookingId: event.bookingId,
      type: "CREDIT",
      amount: event.amount,
      reference: `booking:${event.bookingId}:credit`,
      idempotencyKey: keys.credit,
      metadata: { eventId: event.eventId }
    });
    return transaction;
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const transaction = await findTransactionByIdempotencyKey(keys.credit);
    if (!transaction) throw error;
    return transaction;
  }
}

async function ensureGuestRefund(event, keys, debitTransactionId, reason) {
  const existingRefund = await findTransactionByIdempotencyKey(keys.refund);
  if (existingRefund) return existingRefund;

  const guestWallet = await findOrCreateWallet(event.userId);
  guestWallet.balance += event.amount;
  guestWallet.version += 1;
  await guestWallet.save();

  try {
    const transaction = await createTransaction({
      walletId: guestWallet._id,
      bookingId: event.bookingId,
      type: "REFUND",
      amount: event.amount,
      reference: `booking:${event.bookingId}:refund`,
      idempotencyKey: keys.refund,
      metadata: { reason, debitTransactionId }
    });
    return transaction;
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const transaction = await findTransactionByIdempotencyKey(keys.refund);
    if (!transaction) throw error;
    return transaction;
  }
}

export async function handleBookingCreated(rawEvent) {
  const event = bookingCreatedSchema.parse(rawEvent);
  const keys = paymentKeys(event);
  const { debit: priorDebit, credit: priorCredit, refund: priorRefund } = await getPaymentState(keys);

  // If this booking has already been refunded, keep state consistent and avoid reprocessing.
  if (priorRefund) {
    await emitPaymentFailed(event, "CREDIT_FAILED_REFUNDED", false);
    return;
  }

  if (priorDebit && priorCredit) {
    await emitPaymentSuccess(event, [priorDebit._id.toString(), priorCredit._id.toString()]);
    return;
  }

  let debitTransaction = priorDebit;
  try {
    debitTransaction = await ensureGuestDebit(event, keys, priorDebit);
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      await emitPaymentFailed(event, "INSUFFICIENT_BALANCE", false);
      return;
    }
    // Transient debit issue (e.g. infra/network). Let BullMQ retry.
    throw error;
  }

  let creditTransaction = priorCredit;
  try {
    creditTransaction = await ensureOwnerCredit(event, keys, priorCredit);
  } catch (error) {
    // Debit already succeeded; compensate once and mark booking payment failed.
    await ensureGuestRefund(event, keys, debitTransaction?._id?.toString(), error.message);
    await emitPaymentFailed(event, "CREDIT_FAILED_REFUNDED", true);
    return;
  }

  // Publish success as a separate step so publish failures are retried instead of refunded.
  await emitPaymentSuccess(event, [debitTransaction._id.toString(), creditTransaction._id.toString()]);
}
