# API Endpoints

## Auth
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh-token`

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
- `POST /api/admin/hotels/:hotelId/rooms`
- `GET /api/admin/hotels/:hotelId/rooms`
- `PATCH /api/admin/rooms/:roomId`
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
