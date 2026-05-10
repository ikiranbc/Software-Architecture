/**
 * DTO + Validation Layer (Data Transfer Object pattern):
 * - Defines the explicit API contract for this boundary.
 * - Applies fail-fast validation to protect domain/use-case logic.
 */

import { z } from "zod";

export const topUpSchema = z.object({
  amount: z.number().positive(),
  idempotencyKey: z.string().min(8)
});

export const proceedPaymentSchema = z.object({
  idempotencyKey: z.string().min(8).optional()
});
