# Payment Flow Guide

This guide documents the current step-wise booking and wallet payment process.

## Flow Summary

1. User selects hotel and room.
2. `POST /api/bookings` creates booking:
   - `status = PENDING_PAYMENT`
   - `paymentStatus = PENDING`
   - Redis temporary room lock is created (`room:lock:*`, TTL configurable; default 900s).
3. `POST /api/bookings/:bookingId/confirm` confirms booking details.
4. `POST /api/payments/:bookingId/proceed` starts payment processing:
   - booking payment status is set to `PROCESSING`
   - booking service emits `BOOKING_CREATED` event for async wallet orchestration
5. Wallet service consumes event and performs:
   - guest debit (idempotent)
   - owner/admin credit (idempotent)
   - emit `PAYMENT_SUCCESS` OR `PAYMENT_FAILED`
6. Booking service consumes payment result:
   - success -> `status = CONFIRMED`, `paymentStatus = SUCCESS`
   - fail -> `status = FAILED`, `paymentStatus = FAILED`, `failureReason` set
7. Booking lock release:
   - release on payment success
   - release on payment failure
   - release on booking cancel

## Implementation Map

- Booking creation + lock:
  - `services/booking-service/src/services/booking.service.js`
  - `createBookingForUser`
- Proceed payment bridge:
  - `services/wallet-service/src/services/wallet.service.js`
  - `proceedBookingPayment`
- Internal booking payment endpoints:
  - `services/booking-service/src/routes/booking.routes.js`
- Event queue + worker:
  - `services/wallet-service/src/index.js`
  - `services/wallet-service/src/services/payment-processor.service.js`
- Final booking state transitions:
  - `services/booking-service/src/services/booking.service.js`
  - `handlePaymentEvent`

## Idempotency and Safety

- Booking create idempotency: `bookings.idempotencyKey` (unique)
- Payment transaction idempotency: unique transaction `idempotencyKey` suffixes (`:debit`, `:credit`, `:refund`)
- Duplicate queue job protection with deterministic `jobId`
- Event duplicate handling safe due transaction key reuse

## Failure Rules

- Insufficient wallet balance:
  - emit `PAYMENT_FAILED (INSUFFICIENT_BALANCE)`
  - booking becomes `FAILED`
  - room lock released
- Credit failure after successful debit:
  - refund transaction created once
  - emit `PAYMENT_FAILED (CREDIT_FAILED_REFUNDED)`
  - booking becomes `FAILED`
- Cancel pending booking:
  - booking becomes `CANCELLED`
  - room lock released
