/**
 * Auth Utilities (Security Utility Module):
 * - Encapsulates token/password primitives.
 * - Reused across services to avoid duplicated security logic.
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { normalizeRole } from "@hotel-booking/rbac";
import { env } from "./config.js";
import { httpError } from "./http.js";

function extractBearerToken(headerValue) {
  if (typeof headerValue !== "string") return null;
  let value = headerValue.trim();
  if (!value) return null;

  // Normalize repeated/stacked bearer prefixes from proxies or duplicate headers.
  while (/^Bearer\s+/i.test(value)) {
    value = value.replace(/^Bearer\s+/i, "").trim();
  }

  // If multiple Authorization values are collapsed into one line, use the first.
  value = value.split(",")[0].trim();
  value = value.replace(/^["']|["']$/g, "");

  // Extract the first JWT-looking token defensively.
  const match = value.match(/[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/);
  if (match) return match[0];
  return value || null;
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: normalizeRole(user.role), email: user.email },
    env("JWT_SECRET"),
    { expiresIn: "7d" }
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: normalizeRole(user.role), email: user.email, type: "refresh" },
    env("JWT_SECRET"),
    { expiresIn: "30d" }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, env("JWT_SECRET"));
}

export function verifyRefreshToken(token) {
  const decoded = jwt.verify(token, env("JWT_SECRET"));
  if (decoded.type !== "refresh") throw httpError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
  return decoded;
}

export function requireUser(req, _res, next) {
  const rawAuthorization = req.header("authorization");
  const token = extractBearerToken(rawAuthorization);
  if (process.env.DEBUG_AUTH === "1") {
    const tokenPreview = token ? `${token.slice(0, 24)}...${token.slice(-8)}` : "none";
    console.log(
      `[auth] requireUser ${req.method} ${req.originalUrl} authHeader=${JSON.stringify(rawAuthorization || "")} token=${tokenPreview} tokenLen=${token?.length || 0} xUserId=${req.header("x-user-id") ? "present" : "missing"}`
    );
  }
  if (token) {
    try {
      const decoded = verifyToken(token);
      req.user = { id: decoded.sub, role: normalizeRole(decoded.role), email: decoded.email };
      return next();
    } catch (error) {
      if (process.env.DEBUG_AUTH === "1") {
        console.log(`[auth] token verify failed in service middleware: ${error.message}`);
      }
      throw httpError(401, "Invalid or expired token", "INVALID_TOKEN");
    }
  }

  const id = req.header("x-user-id");
  const role = req.header("x-user-role");
  const email = req.header("x-user-email");
  if (!id || !role) throw httpError(401, "Authentication required", "AUTH_REQUIRED");
  req.user = { id, role: normalizeRole(role), email };
  next();
}

export function requireRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user) throw httpError(401, "Authentication required", "AUTH_REQUIRED");
    const normalizedAllowedRoles = roles.map(normalizeRole);
    if (!normalizedAllowedRoles.includes(normalizeRole(req.user.role))) {
      throw httpError(403, "You do not have permission for this action", "FORBIDDEN");
    }
    next();
  };
}
