# Database Schema Indexes

## users
- unique: `email`
- index: `role`
- index: `status`

## hotels
- index: `ownerId`
- index: `city`
- index: `country`
- index: `approvalStatus`
- index: `isActive`

## rooms
- index: `hotelId`
- unique: `hotelId + roomNumber`

## bookings
- index: `userId`
- index: `ownerId`
- index: `hotelId`
- index: `roomId`
- index: `status`
- index: `paymentStatus`
- unique: `idempotencyKey`
- index: `roomId + checkInDate + checkOutDate + status`

## wallets
- unique: `userId`

## transactions
- index: `walletId`
- index: `bookingId`
- unique: `reference`
- unique: `idempotencyKey`

## auditLogs
- index: `actorId`
- index: `action`
- index: `createdAt`
