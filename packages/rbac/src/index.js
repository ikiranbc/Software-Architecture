/**
 * RBAC Shared Kernel:
 * - Canonical role and status constants used by gateway and services.
 * - Normalization helpers provide backward compatibility with legacy lowercase values.
 */

export const Roles = {
  USER: "USER",
  ADMIN: "ADMIN",
  SUPERADMIN: "SUPERADMIN"
};

export const UserStatuses = {
  ACTIVE: "ACTIVE",
  BLOCKED: "BLOCKED"
};

const LEGACY_ROLE_MAP = {
  user: Roles.USER,
  admin: Roles.ADMIN,
  superadmin: Roles.SUPERADMIN,
  super_admin: Roles.SUPERADMIN,
  "super admin": Roles.SUPERADMIN,
  owner: Roles.ADMIN,
  guest: Roles.USER
};

const LEGACY_STATUS_MAP = {
  active: UserStatuses.ACTIVE,
  blocked: UserStatuses.BLOCKED
};

export function normalizeRole(value) {
  if (!value) return Roles.USER;
  const key = String(value).trim();
  if (!key) return Roles.USER;
  if (Object.values(Roles).includes(key)) return key;
  if (key === "SUPER_ADMIN" || key === "SUPER ADMIN") return Roles.SUPERADMIN;
  return LEGACY_ROLE_MAP[key.toLowerCase()] || Roles.USER;
}

export function normalizeStatus(value) {
  if (!value) return UserStatuses.ACTIVE;
  const key = String(value).trim();
  if (!key) return UserStatuses.ACTIVE;
  if (Object.values(UserStatuses).includes(key)) return key;
  return LEGACY_STATUS_MAP[key.toLowerCase()] || UserStatuses.ACTIVE;
}

export function hasRole(userRole, allowedRoles) {
  const normalized = normalizeRole(userRole);
  return allowedRoles.includes(normalized);
}

export function isAdminRole(role) {
  const normalized = normalizeRole(role);
  return normalized === Roles.ADMIN || normalized === Roles.SUPERADMIN;
}

export function isSuperAdminRole(role) {
  return normalizeRole(role) === Roles.SUPERADMIN;
}
