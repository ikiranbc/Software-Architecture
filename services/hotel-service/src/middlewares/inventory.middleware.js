/**
 * Middleware Layer (Chain of Responsibility pattern):
 * - Handles cross-cutting concerns (normalization, policy checks, guards).
 * - Keeps request pipeline concerns out of controllers/services.
 */

import { httpError, requireRoles } from "@hotel-booking/shared-utils";

// Role policy: inventory CRUD endpoints are restricted to elevated management roles.
export const INVENTORY_ROLES = ["ADMIN", "SUPERADMIN"];

export const requireInventoryRole = requireRoles(...INVENTORY_ROLES);

export function canManageAcrossOwners(role) {
  return role === "ADMIN" || role === "SUPERADMIN";
}

export function assertHotelAccess(hotel, user, message = "Only the hotel owner can manage this hotel") {
  if (canManageAcrossOwners(user.role)) return;
  if (hotel.ownerId.toString() !== user.id) {
    throw httpError(403, message, "FORBIDDEN");
  }
}

export function normalizeHotelQuery(req, _res, next) {
  if (typeof req.query.city === "string") req.query.city = req.query.city.trim();
  if (typeof req.query.country === "string") req.query.country = req.query.country.trim();
  if (typeof req.query.search === "string") req.query.search = req.query.search.trim();
  next();
}
