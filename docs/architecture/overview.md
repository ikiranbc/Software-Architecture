# Architecture Overview

```mermaid
flowchart LR
  C["React Client"] --> G["API Gateway"]
  G --> A["Auth Service"]
  G --> U["User Service"]
  G --> H["Hotel Service"]
  G --> B["Booking Service"]
  G --> W["Wallet Service"]
  G --> AD["Admin Service"]

  A --> M[(MongoDB)]
  U --> M
  H --> M
  B --> M
  W --> M
  AD --> M

  H --> R[(Redis)]
  B --> R
  W --> R

  B --> Q["RabbitMQ"]
  W --> Q
  N["Notification Service"] --> Q
  W --> J["BullMQ Worker"]
  J --> R
```

## Booking + Payment Saga

```mermaid
sequenceDiagram
  participant User
  participant Gateway
  participant Booking
  participant Wallet
  participant MQ as RabbitMQ
  participant Queue as BullMQ

  User->>Gateway: POST /api/bookings
  Gateway->>Booking: create pending booking
  Booking->>Booking: overlap check + Redis room lock

  User->>Gateway: POST /api/bookings/:id/confirm
  Gateway->>Booking: confirm details

  User->>Gateway: POST /api/payments/:id/proceed
  Gateway->>Wallet: proceed payment
  Wallet->>Booking: mark processing (internal)
  Wallet->>Booking: emit BOOKING_CREATED (internal trigger)
  Booking->>MQ: BOOKING_CREATED

  MQ->>Wallet: consume event
  Wallet->>Queue: enqueue payment job
  Queue->>Wallet: process debit/credit with idempotency

  alt payment success
    Wallet->>MQ: PAYMENT_SUCCESS
    MQ->>Booking: mark CONFIRMED/SUCCESS
  else payment fail
    Wallet->>MQ: PAYMENT_FAILED
    MQ->>Booking: mark FAILED
  end
```

## Service Boundaries

- `auth-service`: signup/login/refresh/logout and token issuance.
- `user-service`: user profile APIs.
- `hotel-service`: public hotel/room browsing plus privileged inventory endpoints.
- `booking-service`: booking lifecycle, room lock handling, booking status transitions.
- `wallet-service`: top-up, transactions, payment orchestration.
- `admin-service`: admin + superadmin management and analytics APIs.
- `notification-service`: payment-event notifications persistence.

## Architectural Patterns

- API Gateway Pattern
- Microservices with clean layered service modules
- Repository Pattern
- Service Layer Pattern
- DTO Validation Pattern
- Middleware Chain
- Event-Driven Saga (choreography)
- Queue-based retries (BullMQ)
- Idempotency keys + transaction uniqueness
- Audit logging for sensitive admin/superadmin actions
