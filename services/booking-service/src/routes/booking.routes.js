/**
 * Route Layer (Router + Middleware Composition pattern):
 * - Maps transport paths to controllers.
 * - Composes middleware pipeline explicitly per endpoint.
 */

import { Router } from "express";
import { asyncHandler, requireUser, validateBody } from "@hotel-booking/shared-utils";
import * as bookingController from "../controllers/booking.controller.js";
import {
  confirmBookingSchema,
  createBookingSchema,
  markFailedSchema,
  markProcessingSchema
} from "../dto/booking.dto.js";

const router = Router();

function registerBookingRoute(method, path, ...handlers) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const basePaths = ["/api/bookings", "/bookings"];
  if (normalizedPath !== "/") basePaths.push("");
  for (const base of basePaths) {
    const fullPath = `${base}${normalizedPath}`.replace(/\/{2,}/g, "/");
    router[method](fullPath, ...handlers);
  }
}

registerBookingRoute("post", "/", requireUser, validateBody(createBookingSchema), asyncHandler(bookingController.createBooking));
registerBookingRoute("post", "/:bookingId/confirm", requireUser, validateBody(confirmBookingSchema), asyncHandler(bookingController.confirmBooking));
registerBookingRoute("get", "/my-bookings", requireUser, asyncHandler(bookingController.listMyBookings));
registerBookingRoute("get", "/:bookingId", requireUser, asyncHandler(bookingController.getBooking));
registerBookingRoute("get", "/:bookingId/payment-status", requireUser, asyncHandler(bookingController.getPaymentStatus));
registerBookingRoute("post", "/:bookingId/cancel", requireUser, asyncHandler(bookingController.cancelBooking));

router.get("/internal/bookings/:bookingId", asyncHandler(bookingController.getInternalBookingForPayment));
router.post("/internal/bookings/:bookingId/mark-processing", validateBody(markProcessingSchema), asyncHandler(bookingController.markInternalBookingProcessing));
router.post("/internal/bookings/:bookingId/mark-failed", validateBody(markFailedSchema), asyncHandler(bookingController.markInternalBookingFailed));
router.post("/internal/bookings/:bookingId/emit-booking-created", asyncHandler(bookingController.emitInternalBookingCreated));

export default router;
