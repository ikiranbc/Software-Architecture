/**
 * DTO + Validation Layer (Data Transfer Object pattern):
 * - Defines the explicit API contract for this boundary.
 * - Applies fail-fast validation to protect domain/use-case logic.
 */

import { z } from "zod";
import { normalizeRole, Roles } from "@hotel-booking/rbac";

export const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z
    .string()
    .default(Roles.USER)
    .transform(normalizeRole)
    .refine((role) => [Roles.USER, Roles.ADMIN, Roles.SUPERADMIN].includes(role), "Invalid role"),
  phone: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10)
});
