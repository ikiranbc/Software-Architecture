# Patterns, Implementation, and Usage Map

This file maps each pattern/principle to:

1. where it is implemented
2. where it is used in runtime flow

## Core Architectural Patterns

| Pattern | Implemented In | Used By / Runtime Usage |
| --- | --- | --- |
| Microservices | `services/auth-service`, `services/user-service`, `services/hotel-service`, `services/booking-service`, `services/wallet-service`, `services/admin-service`, `services/notification-service` | Each domain capability runs independently and communicates through gateway/event bus. |
| API Gateway | `apps/api-gateway/src/index.js` | Client calls from `apps/client/src/api.js` hit `/api/*`, gateway applies auth/rate limits, then proxies to domain services. |
| Layered Service Architecture | `services/*/src/{routes,controllers,services,repositories,models,dto,middlewares}` | Every request follows route -> controller -> service -> repository -> model path. |
| Composition Root | `services/*/src/index.js` | Bootstraps infra + route wiring per service at startup. |
| Repository Pattern | `services/*/src/repositories/*.js` | Used by service layer methods in `services/*/src/services/*.js` for persistence access. |
| DTO + Validation | `services/*/src/dto/*.js`, `packages/shared-utils/src/validation.js` | `validateBody(...)` in route files enforces input contracts before controller logic. |
| Middleware Pipeline (Chain of Responsibility) | `services/*/src/middlewares/*.js`, gateway middleware functions in `apps/api-gateway/src/index.js` | Normalization, auth/role checks, and policy checks run before controllers. |
| Application Service / Use-Case Orchestrator | `services/*/src/services/*.js` | Controllers delegate business decisions to service functions. |
| Event-Driven Saga | `services/booking-service/src/services/booking.service.js`, `services/wallet-service/src/services/payment-processor.service.js` | Payment proceed emits `BOOKING_CREATED`; wallet processes payment; wallet emits `PAYMENT_SUCCESS` or `PAYMENT_FAILED`; booking updates status. |
| Retry + Queue Worker | `services/wallet-service/src/index.js` + `services/wallet-service/src/services/payment-processor.service.js` | BullMQ worker retries payment jobs with exponential backoff. |
| Caching Pattern | `services/hotel-service/src/repositories/hotel.repository.js` | Public hotel list endpoint uses Redis cache for list responses and invalidates on inventory mutations. |
| Distributed Locking | `services/booking-service/src/services/booking.service.js` (`withRedisLock` + `room:lock:*`) | Prevents concurrent booking races and holds temporary room lock during payment window. |
| Idempotency Pattern | Booking: `services/booking-service/src/models/booking.model.js` + service logic. Wallet: `services/wallet-service/src/models/transaction.model.js` + service logic. | Safe retries for booking creation and wallet top-up/payment processing. |

## SOLID and Engineering Principles

| Principle | Implemented In | Used By / Observable Behavior |
| --- | --- | --- |
| Single Responsibility Principle (SRP) | Controllers only map HTTP. Services hold business logic. Repositories hold DB logic. DTOs hold input contract. | Lower coupling, easier testing, simpler debugging by layer. |
| Open/Closed Principle (OCP) | Route middleware composition and service modularization | New policies/endpoints can be added with minimal impact to existing code paths. |
| Liskov Substitution (Pragmatic) | Service layer depends on repository contracts | Repository internals can change without changing service/controller consumers. |
| Interface Segregation Principle | Endpoint-specific DTO schemas in `dto/*.js` | Each endpoint validates only the data it actually needs. |
| Dependency Inversion Principle (Module Boundary) | Service layer imports repository APIs rather than embedding query details | Orchestration logic remains independent of persistence implementation details. |
| Separation of Concerns | `src/index.js` composition roots + shared utility modules | Startup wiring and cross-cutting infra are separated from domain use cases. |
| Fail Fast | `validateBody`, role/auth middleware, guard checks in services | Invalid requests fail early before mutating domain state. |

## Request Flow Mappings

### HTTP Flow

1. Client API wrappers (`apps/client/src/api.js`) call gateway.
2. Gateway (`apps/api-gateway/src/index.js`) applies edge middleware and proxies to service.
3. Service route (`services/*/src/routes/*.js`) applies route middleware + DTO validation.
4. Controller (`services/*/src/controllers/*.js`) delegates to service layer.
5. Service (`services/*/src/services/*.js`) executes use case and calls repository.
6. Repository (`services/*/src/repositories/*.js`) talks to model/database.
7. Response returns through controller/gateway to client.

### Booking Payment Saga Flow

1. `POST /api/bookings` creates `PENDING_PAYMENT` booking.
2. `POST /api/bookings/:bookingId/confirm` confirms booking details.
3. `POST /api/payments/:bookingId/proceed` sets payment to `PROCESSING`.
4. Booking service emits `BOOKING_CREATED`.
5. Wallet service consumes event and enqueues BullMQ job.
6. Worker debits guest wallet, credits owner wallet.
7. Wallet emits `PAYMENT_SUCCESS` or `PAYMENT_FAILED`.
8. Booking service consumes payment event and finalizes booking state.

## Fast Navigation

- Architecture overview: `docs/architecture/overview.md`
- Pattern and usage map: `docs/architecture/patterns-and-usage.md`
