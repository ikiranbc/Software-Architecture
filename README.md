# Hotel Booking System

Production-style MERN microservices monorepo for hotel booking with RBAC, wallet payments, event-driven booking confirmation, Redis room locks, and admin/superadmin governance APIs.

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- DB: MongoDB + Mongoose
- Messaging: RabbitMQ
- Caching/locks: Redis
- Queue workers: BullMQ
- Infra: Docker Compose

## Monorepo Structure

```text
hotel-booking-system/
  apps/
    client/
    api-gateway/

  services/
    auth-service/
    user-service/
    hotel-service/
    booking-service/
    wallet-service/
    admin-service/
    notification-service/

  packages/
    shared-types/
    shared-utils/
    shared-config/
    event-contracts/
    rbac/

  infra/
    docker/
    mongodb/
    redis/
    rabbitmq/

  docs/
    architecture/
    api/
    database/
    runbooks/
```

## Roles

- `USER`
- `ADMIN`
- `SUPERADMIN`

## Key Features

- JWT auth + refresh token endpoint
- bcrypt password hashing
- RBAC in gateway and service layers
- Hotel search and room visibility
- Booking flow:
  1. Create booking (`PENDING_PAYMENT`)
  2. Confirm booking details
  3. Proceed payment
  4. Payment success/fail event updates booking status
- Redis room lock with TTL during payment window
- Wallet top-up + debit/credit/refund transaction records
- Idempotent booking and payment handling
- Admin hotel/room CRUD + booking/revenue views
- Superadmin user governance, hotel approval, platform reports, audit logs
- Notification service that consumes payment events and stores notification records

## Main API Surface

See full list in [docs/api/endpoints.md](docs/api/endpoints.md).

## Run (Recommended)

```bash
npm install
npm start
```

Then check:

```bash
./scripts/healthcheck.sh
```

## Docker Only

```bash
docker compose up --build
```

## Default Seeded Accounts

- `superadmin@hotel.local` / `SuperAdmin@123` (`SUPERADMIN`)
- `admin@hotel.local` / `Admin@12345` (`ADMIN`)
- `user@hotel.local` / `User@12345` (`USER`)

If an account is accidentally blocked in local/dev, run:

```bash
npm run fix:unblock-user -- --email user@hotel.local
```

List blocked users:

```bash
npm run fix:unblock-user -- --list-blocked
```

Unblock every blocked user:

```bash
npm run fix:unblock-user -- --all-blocked
```

Normalize legacy lowercase `role/status` values:

```bash
npm run fix:unblock-user -- --normalize-legacy
```

## Ports

- Client: `5173`
- API Gateway: `8790`
- Auth: `4001`
- User: `4002`
- Hotel: `4003`
- Booking: `4004`
- Wallet: `4005`
- Admin: `4006`
- Notification: `4007`
- MongoDB: `27017`
- Redis: `6379`
- RabbitMQ: `5672` (`15672` management UI)

## Security Controls

- Helmet + CORS at gateway and services
- Rate limiting at gateway auth/booking entry points
- DTO validation with Zod
- Role-based route guards
- Audit logging for sensitive superadmin/admin actions
- Idempotency key constraints in booking and transactions

## Additional Docs

- [Architecture Overview](docs/architecture/overview.md)
- [Patterns and Usage](docs/architecture/patterns-and-usage.md)
- [Payment Flow](docs/architecture/payment-flow.md)
- [API Endpoints](docs/api/endpoints.md)
- [DB Indexes](docs/database/schema-indexes.md)
- [Local Runbook](docs/runbooks/local-development.md)
