/**
 * Dev Bootstrap (Environment-specific bootstrap pattern):
 * - Ensures local/demo accounts exist and remain ACTIVE for developer workflows.
 * - Explicitly gated to non-production environments to avoid production side effects.
 */

import { hashPassword } from "@hotel-booking/shared-utils";
import { normalizeRole, normalizeStatus, Roles, UserStatuses } from "@hotel-booking/rbac";
import { User } from "../models/user.model.js";

const DEFAULT_DEV_USERS = [
  { name: "Platform Superadmin", email: "superadmin@hotel.local", password: "SuperAdmin@123", role: Roles.SUPERADMIN },
  { name: "Operations Admin", email: "admin@hotel.local", password: "Admin@12345", role: Roles.ADMIN },
  { name: "Standard User", email: "user@hotel.local", password: "User@12345", role: Roles.USER }
];

function isEnabled(value, fallback) {
  if (value === undefined) return fallback;
  const normalized = String(value).trim().toLowerCase();
  return !["0", "false", "no", "off"].includes(normalized);
}

async function migrateLegacyUserEnums() {
  const roleMappings = [
    ["user", Roles.USER],
    ["admin", Roles.ADMIN],
    ["superadmin", Roles.SUPERADMIN],
    ["guest", Roles.USER],
    ["owner", Roles.ADMIN]
  ];

  const statusMappings = [
    ["active", UserStatuses.ACTIVE],
    ["blocked", UserStatuses.BLOCKED]
  ];

  let changed = 0;
  for (const [legacyRole, canonicalRole] of roleMappings) {
    const roleResult = await User.updateMany({ role: legacyRole }, { $set: { role: normalizeRole(canonicalRole) } });
    changed += roleResult.modifiedCount || 0;
  }

  for (const [legacyStatus, canonicalStatus] of statusMappings) {
    const statusResult = await User.updateMany(
      { status: legacyStatus },
      { $set: { status: normalizeStatus(canonicalStatus) } }
    );
    changed += statusResult.modifiedCount || 0;
  }

  if (changed > 0) {
    console.log(`[auth-service] migrated legacy user role/status records: ${changed}`);
  }
}

export async function ensureDevUsersActive() {
  const isNonProduction = process.env.NODE_ENV !== "production";
  const bootstrapEnabled = isEnabled(process.env.ENABLE_DEV_USER_BOOTSTRAP, isNonProduction);
  if (!bootstrapEnabled) return;

  await migrateLegacyUserEnums();

  const resetPasswords = isEnabled(process.env.RESET_DEV_USER_PASSWORDS, true);

  for (const account of DEFAULT_DEV_USERS) {
    const email = account.email.toLowerCase();
    const existing = await User.findOne({ email });

    if (!existing) {
      await User.create({
        name: account.name,
        email,
        role: account.role,
        status: UserStatuses.ACTIVE,
        passwordHash: await hashPassword(account.password)
      });
      console.log(`[auth-service] bootstrapped dev user: ${email}`);
      continue;
    }

    const patch = {
      name: account.name,
      role: account.role,
      status: UserStatuses.ACTIVE
    };

    if (resetPasswords || !existing.passwordHash) {
      patch.passwordHash = await hashPassword(account.password);
    }

    await User.updateOne({ _id: existing._id }, { $set: patch });
    console.log(`[auth-service] ensured ACTIVE dev user: ${email}`);
  }
}
