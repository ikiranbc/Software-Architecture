/**
 * Middleware Layer (Chain of Responsibility pattern):
 * - Handles cross-cutting concerns (normalization, policy checks, guards).
 * - Keeps request pipeline concerns out of controllers/services.
 */

function unwrapAccidentalPostmanLiteral(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  const match = trimmed.match(/^\{\{\s*(.+?)\s*\}\}$/);
  return match ? match[1].trim() : trimmed;
}

export function normalizeAuthBody(req, _res, next) {
  if (typeof req.body?.email === "string") {
    req.body.email = unwrapAccidentalPostmanLiteral(req.body.email).toLowerCase();
  }
  if (typeof req.body?.name === "string") {
    req.body.name = unwrapAccidentalPostmanLiteral(req.body.name);
  }
  if (typeof req.body?.password === "string") {
    req.body.password = unwrapAccidentalPostmanLiteral(req.body.password);
  }
  next();
}
