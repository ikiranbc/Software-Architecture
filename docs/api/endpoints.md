# API Endpoints

Postman collection:

```text
docs/api/hotel-booking-system.postman_collection.json
```

## Auth
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh-token`

### Postman Quickstart

Base URL:

```text
http://localhost:8790
```

For protected endpoints, add this header after login:

```text
Authorization: Bearer <token>
```

Signup a new user:

```http
POST /api/auth/signup
```

```json
{
  "name": "Postman User",
  "email": "postman.user@example.com",
  "password": "UserPass@12345",
  "phone": "+1-555-1000"
}
```

Create an admin account as superadmin:

```http
POST /api/superadmin/admins
```

```json
{
  "name": "Postman Admin",
  "email": "postman.admin@example.com",
  "password": "AdminPass@12345",
  "phone": "+1-555-2000"
}
```

List hotel rooms:

```http
GET /api/hotels/:hotelId/rooms?guests=1
```

Create a booking:

```http
POST /api/bookings
```

```json
{
  "roomId": "<roomId>",
  "checkInDate": "2026-12-03",
  "checkOutDate": "2026-12-04",
  "guests": 1,
  "idempotencyKey": "booking-unique-001"
}
```

Cancel a booking:

```http
POST /api/bookings/:bookingId/cancel
```

Top up wallet:

```http
POST /api/wallet/top-up
```

```json
{
  "amount": 2000,
  "idempotencyKey": "topup-unique-001"
}
```

Confirm and proceed payment:

```http
POST /api/bookings/:bookingId/confirm
POST /api/payments/:bookingId/proceed
GET /api/bookings/:bookingId/payment-status
```

```json
{
  "idempotencyKey": "payment-unique-001"
}
```

### Postman Login Examples

Use plain JSON values:

```json
{
  "email": "superadmin@hotel.local",
  "password": "SuperAdmin@123"
}
```

or:

```json
{
  "email": "admin@hotel.local",
  "password": "Admin@12345"
}
```

Do not wrap literal credentials in Postman variable braces. This is invalid:

```json
{
  "email": "{{superadmin@hotel.local}}",
  "password": "{{SuperAdmin@123}}"
}
```

If you want to use Postman variables, create variables named `superadmin_email` and `superadmin_password`, then use:

```json
{
  "email": "{{superadmin_email}}",
  "password": "{{superadmin_password}}"
}
```

## Hotels
- `GET /api/hotels`
- `GET /api/hotels/:hotelId`
- `GET /api/hotels/:hotelId/rooms`

## Bookings
- `POST /api/bookings`
- `POST /api/bookings/:bookingId/confirm`
- `POST /api/bookings/:bookingId/cancel`
- `GET /api/bookings/my-bookings`
- `GET /api/bookings/:bookingId`
- `GET /api/bookings/:bookingId/payment-status`

## Payments
- `POST /api/payments/:bookingId/proceed`

## Wallet
- `POST /api/wallet/top-up`
- `GET /api/wallet/balance`
- `GET /api/wallet/transactions`

## Admin
- `POST /api/admin/hotels`
- `GET /api/admin/hotels`
- `PATCH /api/admin/hotels/:hotelId`
- `DELETE /api/admin/hotels/:hotelId`
- `POST /api/admin/hotels/:hotelId/rooms`
- `GET /api/admin/hotels/:hotelId/rooms`
- `PATCH /api/admin/rooms/:roomId`
- `DELETE /api/admin/rooms/:roomId`
- `GET /api/admin/bookings`
- `GET /api/admin/revenue`

## SuperAdmin
- `GET /api/superadmin/users`
- `POST /api/superadmin/admins`
- `PATCH /api/superadmin/users/:userId/block`
- `PATCH /api/superadmin/users/:userId/unblock`
- `PATCH /api/superadmin/users/:userId/role`
- `GET /api/superadmin/hotels`
- `PATCH /api/superadmin/hotels/:hotelId/approve`
- `PATCH /api/superadmin/hotels/:hotelId/reject`
- `GET /api/superadmin/bookings`
- `GET /api/superadmin/transactions`
- `GET /api/superadmin/reports`
- `GET /api/superadmin/audit-logs`
