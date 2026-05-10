import { randomUUID } from "node:crypto";
import { z } from "zod";

export const EventTypes = {
  BOOKING_CREATED: "BOOKING_CREATED",
  PAYMENT_SUCCESS: "PAYMENT_SUCCESS",
  PAYMENT_FAILED: "PAYMENT_FAILED"
};

export const bookingCreatedSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.literal(EventTypes.BOOKING_CREATED),
  bookingId: z.string(),
  userId: z.string(),
  ownerId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  idempotencyKey: z.string().min(8),
  timestamp: z.string()
});

export const paymentSuccessSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.literal(EventTypes.PAYMENT_SUCCESS),
  bookingId: z.string(),
  transactionIds: z.array(z.string()),
  idempotencyKey: z.string().min(8),
  timestamp: z.string()
});

export const paymentFailedSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.literal(EventTypes.PAYMENT_FAILED),
  bookingId: z.string(),
  reasonCode: z.string(),
  retryable: z.boolean(),
  idempotencyKey: z.string().min(8),
  timestamp: z.string()
});

export function makeEvent(eventType, payload) {
  return {
    eventId: randomUUID(),
    eventType,
    timestamp: new Date().toISOString(),
    ...payload
  };
}
