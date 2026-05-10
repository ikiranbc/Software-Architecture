/**
 * Middleware Layer (Chain of Responsibility pattern):
 * - Handles cross-cutting concerns (normalization, policy checks, guards).
 * - Keeps request pipeline concerns out of controllers/services.
 */

export function normalizeProfileBody(req, _res, next) {
  if (typeof req.body?.name === "string") {
    req.body.name = req.body.name.trim();
  }
  if (typeof req.body?.phone === "string") {
    req.body.phone = req.body.phone.trim();
  }
  next();
}
