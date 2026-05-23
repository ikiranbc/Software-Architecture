/**
 * Shared Config Package:
 * - Centralizes common environment defaults for services.
 */

export const serviceUrls = {
  auth: process.env.AUTH_SERVICE_URL || "http://127.0.0.1:4001",
  user: process.env.USER_SERVICE_URL || "http://127.0.0.1:4002",
  hotel: process.env.HOTEL_SERVICE_URL || "http://127.0.0.1:4003",
  booking: process.env.BOOKING_SERVICE_URL || "http://127.0.0.1:4004",
  wallet: process.env.WALLET_SERVICE_URL || "http://127.0.0.1:4005",
  admin: process.env.ADMIN_SERVICE_URL || "http://127.0.0.1:4006",
  notification: process.env.NOTIFICATION_SERVICE_URL || "http://127.0.0.1:4007"
};

export const defaults = {
  currency: "USD",
  roomLockSeconds: Number(process.env.ROOM_LOCK_SECONDS || 900),
  bookingPageLimit: Number(process.env.BOOKING_PAGE_LIMIT || 20)
};
