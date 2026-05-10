/**
 * Middleware Layer (Chain of Responsibility pattern):
 * - Handles cross-cutting concerns (normalization, policy checks, guards).
 * - Keeps request pipeline concerns out of controllers/services.
 */

export function normalizeAuthBody(req, _res, next) {
  if (typeof req.body?.email === "string") {
    req.body.email = req.body.email.trim().toLowerCase();
  }
  if (typeof req.body?.name === "string") {
    req.body.name = req.body.name.trim();
  }
  next();
}
