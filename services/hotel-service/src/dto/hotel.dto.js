/**
 * DTO + Validation Layer (Data Transfer Object pattern):
 * - Defines the explicit API contract for this boundary.
 * - Applies fail-fast validation to protect domain/use-case logic.
 */

import { z } from "zod";

const optionalBooleanSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return value;
}, z.boolean().optional());

export const createHotelSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().min(2),
  country: z.string().min(2),
  amenities: z.array(z.string()).default([])
});

export const createRoomSchema = z.object({
  roomNumber: z.string().min(1),
  type: z.string().transform((value) => value.toUpperCase()).pipe(z.enum(["STANDARD", "DELUXE", "SUITE"])),
  capacity: z.coerce.number().int().positive(),
  pricePerNight: z.coerce.number().positive(),
  amenities: z.array(z.string()).default([]),
  isActive: optionalBooleanSchema
});

export const updateHotelSchema = createHotelSchema.partial();
export const updateRoomSchema = createRoomSchema.partial();
