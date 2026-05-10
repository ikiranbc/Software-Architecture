/**
 * Middleware Layer (Chain of Responsibility pattern):
 * - Handles cross-cutting concerns (normalization, policy checks, guards).
 * - Keeps request pipeline concerns out of controllers/services.
 */

export function canModerateBookings(role) {
  return role === "ADMIN" || role === "SUPERADMIN";
}
