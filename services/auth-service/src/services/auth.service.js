/**
 * Service Layer (Application Service / Use-Case Interactor pattern):
 * - Implements business rules and orchestration.
 * - Coordinates repositories, policies, and external integrations.
 */

import {
  comparePassword,
  hashPassword,
  httpError,
  signRefreshToken,
  signToken,
  verifyRefreshToken
} from "@hotel-booking/shared-utils";
import { normalizeRole, normalizeStatus, UserStatuses } from "@hotel-booking/rbac";
import { createUser, findUserByEmail } from "../repositories/user.repository.js";

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: normalizeRole(user.role),
    phone: user.phone,
    status: normalizeStatus(user.status)
  };
}

export async function signup(payload) {
  const existing = await findUserByEmail(payload.email);
  if (existing) throw httpError(409, "Email is already registered", "EMAIL_EXISTS");

  const user = await createUser({
    ...payload,
    passwordHash: await hashPassword(payload.password)
  });

  return { token: signToken(user), refreshToken: signRefreshToken(user), user: publicUser(user) };
}

export async function login(payload) {
  const user = await findUserByEmail(payload.email);
  if (!user || !(await comparePassword(payload.password, user.passwordHash))) {
    throw httpError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }
  if (normalizeStatus(user.status) !== UserStatuses.ACTIVE) {
    throw httpError(403, "Account is blocked", "ACCOUNT_BLOCKED");
  }

  return { token: signToken(user), refreshToken: signRefreshToken(user), user: publicUser(user) };
}

export async function refreshAuthToken(payload) {
  const decoded = verifyRefreshToken(payload.refreshToken);
  const user = await findUserByEmail(decoded.email);
  if (!user || user._id.toString() !== decoded.sub) {
    throw httpError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
  }
  if (normalizeStatus(user.status) !== UserStatuses.ACTIVE) {
    throw httpError(403, "Account is blocked", "ACCOUNT_BLOCKED");
  }
  return { token: signToken(user), refreshToken: signRefreshToken(user), user: publicUser(user) };
}

export async function logout() {
  return { ok: true };
}
