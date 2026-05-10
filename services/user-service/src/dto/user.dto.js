/**
 * DTO + Validation Layer (Data Transfer Object pattern):
 * - Defines the explicit API contract for this boundary.
 * - Applies fail-fast validation to protect domain/use-case logic.
 */

import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional()
});
