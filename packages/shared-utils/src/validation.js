/**
 * Validation Utilities (Decorator-style middleware helpers):
 * - Centralized request validation and uniform error shaping.
 */

import { httpError } from "./http.js";

export function validateBody(schema) {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw httpError(400, parsed.error.issues.map((issue) => issue.message).join(", "), "VALIDATION_ERROR");
    }
    req.body = parsed.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw httpError(400, parsed.error.issues.map((issue) => issue.message).join(", "), "VALIDATION_ERROR");
    }
    req.query = parsed.data;
    next();
  };
}
