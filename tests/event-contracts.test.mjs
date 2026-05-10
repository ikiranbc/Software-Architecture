import test from "node:test";
import assert from "node:assert/strict";
import { bookingCreatedSchema, EventTypes, makeEvent, paymentFailedSchema, paymentSuccessSchema } from "@hotel-booking/event-contracts";

test("BOOKING_CREATED contract validates", () => {
  const event = makeEvent(EventTypes.BOOKING_CREATED, {
    bookingId: "b1",
    userId: "u1",
    ownerId: "o1",
    amount: 120,
    currency: "USD",
    idempotencyKey: "idem-12345678"
  });
  const parsed = bookingCreatedSchema.safeParse(event);
  assert.equal(parsed.success, true);
});

test("PAYMENT_SUCCESS contract validates", () => {
  const event = makeEvent(EventTypes.PAYMENT_SUCCESS, {
    bookingId: "b1",
    transactionIds: ["t1", "t2"],
    idempotencyKey: "idem-12345678"
  });
  const parsed = paymentSuccessSchema.safeParse(event);
  assert.equal(parsed.success, true);
});

test("PAYMENT_FAILED contract validates", () => {
  const event = makeEvent(EventTypes.PAYMENT_FAILED, {
    bookingId: "b1",
    reasonCode: "INSUFFICIENT_BALANCE",
    retryable: false,
    idempotencyKey: "idem-12345678"
  });
  const parsed = paymentFailedSchema.safeParse(event);
  assert.equal(parsed.success, true);
});
