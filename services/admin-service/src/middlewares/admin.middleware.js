import { requireRoles } from "@hotel-booking/shared-utils";

export const requireAdminRole = requireRoles("ADMIN", "SUPERADMIN");
export const requireSuperAdminRole = requireRoles("SUPERADMIN");

export function auditContext(req) {
  return {
    actorId: req.user.id,
    actorRole: req.user.role,
    ipAddress: req.ip,
    userAgent: req.get("user-agent") || "unknown"
  };
}
