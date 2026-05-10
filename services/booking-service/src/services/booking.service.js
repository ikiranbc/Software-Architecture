/**
 * Service Layer (Application Service / Use-Case Interactor pattern):
 * - Implements business rules and orchestration.
 * - Coordinates repositories, policies, and external integrations.
 */

import {
  getRedis,
  httpError,
  publishEvent,
  withRedisLock
} from "@hotel-booking/shared-utils";
import {
  EventTypes,
  makeEvent,
  paymentFailedSchema,
  paymentSuccessSchema
} from "@hotel-booking/event-contracts";
import { defaults } from "@hotel-booking/shared-config";
import { canModerateBookings } from "../middlewares/booking.middleware.js";
import {
  createBooking,
  findBookingById,
  findBookingByIdAndUser,
  findBookingByIdempotencyKey,
  findBookingsByUserId,
  hasBookingOverlap,
  updateBookingById,
  updateBookingByIdAndUser
} from "../repositories/booking.repository.js";

let rabbitChannel;

export function setBookingEventChannel(channel) {
  rabbitChannel = channel;
}

function toIdString(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value.toString === "function") return value.toString();
  return null;
}

function serializeBooking(booking) {
  return {
    id: toIdString(booking?._id),
    userId: toIdString(booking?.userId),
    ownerId: toIdString(booking?.ownerId),
    hotelId: toIdString(booking?.hotelId),
    roomId: toIdString(booking?.roomId),
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    nights: booking.nights,
    guests: booking.guests,
    totalAmount: booking.totalAmount,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    idempotencyKey: booking.idempotencyKey,
    failureReason: booking.failureReason,
    lockExpiresAt: booking.lockExpiresAt,
    createdAt: booking.createdAt
  };
}

function calculateNights(checkInDate, checkOutDate) {
  const diff = checkOutDate.getTime() - checkInDate.getTime();
  return Math.ceil(diff / 86_400_000);
}

function roomLockKey(roomId, checkInDate, checkOutDate) {
  const from = new Date(checkInDate).toISOString().slice(0, 10);
  const to = new Date(checkOutDate).toISOString().slice(0, 10);
  return `room:lock:${roomId}:${from}:${to}`;
}

async function fetchRoom(roomId) {
  const baseUrl = process.env.HOTEL_SERVICE_URL || "http://localhost:4003";
  const response = await fetch(`${baseUrl}/internal/rooms/${roomId}`);
  if (!response.ok) throw httpError(400, "Selected room is not available", "ROOM_UNAVAILABLE");
  return response.json();
}

async function releaseRoomLock(booking) {
  if (!booking?.lockKey) return;
  try {
    await getRedis().del(booking.lockKey);
  } catch {
    // Best-effort release. Booking status remains source of truth.
  }
}

export async function createBookingForUser(user, payload) {
  const existing = await findBookingByIdempotencyKey(payload.idempotencyKey, user.id);
  if (existing) return { statusCode: 200, payload: serializeBooking(existing) };

  const { roomId, checkInDate, checkOutDate, guests, idempotencyKey } = payload;
  const nights = calculateNights(checkInDate, checkOutDate);
  if (nights <= 0) throw httpError(400, "Check-out date must be after check-in date", "INVALID_DATE_RANGE");

  const lockKey = `lock:booking:create:${roomId}`;
  const result = await withRedisLock(lockKey, 10_000, async () => {
    const { room, hotel } = await fetchRoom(roomId);
    if (room.capacity < guests) throw httpError(400, "Room capacity is too small for this booking", "CAPACITY_EXCEEDED");
    if (await hasBookingOverlap(roomId, checkInDate, checkOutDate)) {
      throw httpError(409, "Room is already booked for those dates", "ROOM_ALREADY_BOOKED");
    }

    const bookingLockKey = roomLockKey(roomId, checkInDate, checkOutDate);
    const lockSeconds = defaults.roomLockSeconds;
    const lockAcquired = await getRedis().set(bookingLockKey, `${user.id}:${idempotencyKey}`, "EX", lockSeconds, "NX");
    if (!lockAcquired) {
      throw httpError(409, "Room is temporarily locked for another booking flow", "ROOM_TEMP_LOCKED");
    }

    const totalAmount = nights * room.pricePerNight;
    const lockExpiresAt = new Date(Date.now() + lockSeconds * 1000);
    const booking = await createBooking({
      userId: user.id,
      ownerId: hotel.ownerId,
      hotelId: hotel.id,
      roomId,
      checkInDate,
      checkOutDate,
      nights,
      guests,
      totalAmount,
      idempotencyKey,
      status: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      lockKey: bookingLockKey,
      lockExpiresAt
    });

    return booking;
  });

  if (!result.locked) {
    throw httpError(409, "A booking is already being processed for this room and date range", "BOOKING_LOCKED");
  }

  return { statusCode: 201, payload: serializeBooking(result.value) };
}

export async function confirmBookingForUser(user, bookingId) {
  const booking = await findBookingByIdAndUser(bookingId, user.id);
  if (!booking) throw httpError(404, "Booking not found", "BOOKING_NOT_FOUND");

  if (booking.status !== "PENDING_PAYMENT") {
    throw httpError(400, "Only pending bookings can be confirmed", "INVALID_STATUS");
  }

  if (booking.paymentStatus !== "PENDING") {
    return serializeBooking(booking);
  }

  booking.paymentStatus = "PENDING";
  await booking.save();
  return serializeBooking(booking);
}

export async function listMyBookings(userId) {
  const bookings = await findBookingsByUserId(userId);
  return { data: bookings.map(serializeBooking) };
}

export async function getBookingForUser(user, bookingId) {
  const booking = await findBookingById(bookingId);
  if (!booking) throw httpError(404, "Booking not found", "BOOKING_NOT_FOUND");

  const bookingUserId = toIdString(booking.userId);
  if (!bookingUserId) {
    throw httpError(500, "Booking data is invalid: missing userId", "BOOKING_DATA_INTEGRITY");
  }

  if (bookingUserId !== user.id && !canModerateBookings(user.role)) {
    throw httpError(403, "You cannot view this booking", "FORBIDDEN");
  }

  return serializeBooking(booking);
}

export async function getBookingPaymentStatusForUser(user, bookingId) {
  const booking = await getBookingForUser(user, bookingId);
  return {
    bookingId: booking.id,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    failureReason: booking.failureReason || null
  };
}

export async function cancelBookingForUser(user, bookingId) {
  const booking = await findBookingById(bookingId);
  if (!booking) throw httpError(404, "Booking not found", "BOOKING_NOT_FOUND");

  const bookingUserId = toIdString(booking.userId);
  if (!bookingUserId) {
    throw httpError(500, "Booking data is invalid: missing userId", "BOOKING_DATA_INTEGRITY");
  }

  if (bookingUserId !== user.id && !canModerateBookings(user.role)) {
    throw httpError(403, "You cannot cancel this booking", "FORBIDDEN");
  }

  if (!["PENDING_PAYMENT", "CONFIRMED"].includes(booking.status)) {
    throw httpError(400, "Only pending or confirmed bookings can be cancelled", "INVALID_STATUS");
  }

  const updated = await updateBookingById(bookingId, {
    status: "CANCELLED",
    paymentStatus: booking.paymentStatus === "SUCCESS" ? "REFUNDED" : booking.paymentStatus
  });
  await releaseRoomLock(booking);
  return serializeBooking(updated);
}

export async function getInternalBookingForPayment(bookingId) {
  const booking = await findBookingById(bookingId);
  if (!booking) throw httpError(404, "Booking not found", "BOOKING_NOT_FOUND");

  const bookingUserId = toIdString(booking.userId);
  const bookingOwnerId = toIdString(booking.ownerId);
  if (!bookingUserId || !bookingOwnerId) {
    throw httpError(500, "Booking data is invalid for payment processing", "BOOKING_DATA_INTEGRITY");
  }

  return {
    id: toIdString(booking._id),
    userId: bookingUserId,
    ownerId: bookingOwnerId,
    totalAmount: booking.totalAmount,
    currency: "USD",
    idempotencyKey: booking.idempotencyKey,
    status: booking.status,
    paymentStatus: booking.paymentStatus
  };
}

export async function markPaymentProcessing(bookingId, userId) {
  const existing = await findBookingByIdAndUser(bookingId, userId);
  if (!existing) throw httpError(404, "Booking not found", "BOOKING_NOT_FOUND");
  if (existing.status !== "PENDING_PAYMENT") {
    throw httpError(400, "Only pending bookings can proceed to payment", "INVALID_STATUS");
  }
  if (existing.paymentStatus === "SUCCESS") return serializeBooking(existing);

  const booking = await updateBookingByIdAndUser(bookingId, userId, {
    paymentStatus: "PROCESSING",
    failureReason: undefined
  });

  if (booking.status !== "PENDING_PAYMENT") {
    throw httpError(400, "Only pending bookings can proceed to payment", "INVALID_STATUS");
  }
  return serializeBooking(booking);
}

export async function markPaymentFailedBySystem(bookingId, reasonCode) {
  const booking = await findBookingById(bookingId);
  if (!booking) return null;
  if (booking.status !== "PENDING_PAYMENT") return serializeBooking(booking);
  const updated = await updateBookingById(bookingId, {
    status: "FAILED",
    paymentStatus: "FAILED",
    failureReason: reasonCode
  });
  await releaseRoomLock(booking);
  return updated ? serializeBooking(updated) : null;
}

export async function handlePaymentEvent(event) {
  if (event.eventType === EventTypes.PAYMENT_SUCCESS) {
    const parsed = paymentSuccessSchema.parse(event);
    const booking = await findBookingById(parsed.bookingId);
    if (!booking) return;

    if (booking.status === "CONFIRMED" && booking.paymentStatus === "SUCCESS") return;
    if (booking.status !== "PENDING_PAYMENT") return;

    await updateBookingById(parsed.bookingId, {
      status: "CONFIRMED",
      paymentStatus: "SUCCESS",
      failureReason: undefined
    });
    await releaseRoomLock(booking);
    return;
  }

  if (event.eventType === EventTypes.PAYMENT_FAILED) {
    const parsed = paymentFailedSchema.parse(event);
    await markPaymentFailedBySystem(parsed.bookingId, parsed.reasonCode);
  }
}

export async function publishBookingCreatedEventForPayment(bookingId) {
  const booking = await getInternalBookingForPayment(bookingId);

  const event = makeEvent(EventTypes.BOOKING_CREATED, {
    bookingId: booking.id,
    userId: booking.userId,
    ownerId: booking.ownerId,
    amount: booking.totalAmount,
    currency: "USD",
    idempotencyKey: booking.idempotencyKey
  });

  await publishEvent(rabbitChannel, EventTypes.BOOKING_CREATED, event);
  return event;
}
