/**
 * Repository Layer (Repository pattern):
 * - Encapsulates data access/query details behind stable methods.
 * - Supports Dependency Inversion by decoupling services from storage specifics.
 */

import { Booking } from "../models/booking.model.js";

export function findBookingById(bookingId) {
  return Booking.findById(bookingId);
}

export function findBookingByIdAndUser(bookingId, userId) {
  return Booking.findOne({ _id: bookingId, userId });
}

export function findBookingsByUserId(userId) {
  return Booking.find({ userId }).sort({ createdAt: -1 });
}

export function findBookingByIdempotencyKey(idempotencyKey, userId) {
  return Booking.findOne({ idempotencyKey, userId });
}

export function createBooking(payload) {
  return Booking.create(payload);
}

export function hasBookingOverlap(roomId, checkInDate, checkOutDate) {
  return Booking.exists({
    roomId,
    status: { $in: ["PENDING_PAYMENT", "CONFIRMED"] },
    checkInDate: { $lt: checkOutDate },
    checkOutDate: { $gt: checkInDate }
  });
}

export function updateBookingById(bookingId, payload) {
  return Booking.findByIdAndUpdate(bookingId, payload, { new: true });
}

export function updateBookingByIdAndUser(bookingId, userId, payload, options = {}) {
  return Booking.findOneAndUpdate({ _id: bookingId, userId }, payload, { new: true, ...options });
}
