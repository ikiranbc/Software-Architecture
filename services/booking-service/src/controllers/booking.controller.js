/**
 * Controller Layer (MVC / Interface Adapter pattern):
 * - Translates HTTP input/output for the application boundary.
 * - Delegates business decisions to services (Single Responsibility Principle).
 */

import * as bookingService from "../services/booking.service.js";

export async function createBooking(req, res) {
  const { statusCode, payload } = await bookingService.createBookingForUser(req.user, req.body);
  res.status(statusCode).json(payload);
}

export async function confirmBooking(req, res) {
  const payload = await bookingService.confirmBookingForUser(req.user, req.params.bookingId);
  res.json(payload);
}

export async function listMyBookings(req, res) {
  const payload = await bookingService.listMyBookings(req.user.id);
  res.json(payload);
}

export async function getBooking(req, res) {
  const payload = await bookingService.getBookingForUser(req.user, req.params.bookingId);
  res.json(payload);
}

export async function getPaymentStatus(req, res) {
  const payload = await bookingService.getBookingPaymentStatusForUser(req.user, req.params.bookingId);
  res.json(payload);
}

export async function cancelBooking(req, res) {
  const payload = await bookingService.cancelBookingForUser(req.user, req.params.bookingId);
  res.json(payload);
}

export async function getInternalBookingForPayment(req, res) {
  const payload = await bookingService.getInternalBookingForPayment(req.params.bookingId);
  res.json(payload);
}

export async function markInternalBookingProcessing(req, res) {
  const payload = await bookingService.markPaymentProcessing(req.params.bookingId, req.body.userId);
  res.json(payload);
}

export async function markInternalBookingFailed(req, res) {
  const payload = await bookingService.markPaymentFailedBySystem(req.params.bookingId, req.body.reasonCode || "PAYMENT_FAILED");
  res.json(payload || { ok: true });
}

export async function emitInternalBookingCreated(req, res) {
  const payload = await bookingService.publishBookingCreatedEventForPayment(req.params.bookingId);
  res.status(202).json({ ok: true, eventId: payload.eventId });
}
