/**
 * Middleware Layer (Chain of Responsibility pattern):
 * - Handles cross-cutting concerns (normalization, policy checks, guards).
 * - Keeps request pipeline concerns out of controllers/services.
 */

export function normalizeWalletBody(req, _res, next) {
  if (typeof req.body?.idempotencyKey === "string") {
    req.body.idempotencyKey = req.body.idempotencyKey.trim();
  }
  next();
}
