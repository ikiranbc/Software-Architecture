/**
 * DTO + Validation Layer (Data Transfer Object pattern):
 * - Defines the explicit API contract for this boundary.
 * - Applies fail-fast validation to protect domain/use-case logic.
 */

import { z } from "zod";

export const createBookingSchema = z.object({
  roomId: z.string().min(1),
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date(),
  guests: z.number().int().positive(),
  idempotencyKey: z.string().min(8)
});

export const confirmBookingSchema = z.object({
  idempotencyKey: z.string().min(8).optional()
});

export const markProcessingSchema = z.object({
  userId: z.string().min(1)
});

export const markFailedSchema = z.object({
  reasonCode: z.string().min(1).optional()
});
