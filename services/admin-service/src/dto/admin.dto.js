import { z } from "zod";
import { Roles } from "@hotel-booking/rbac";

const roomTypeSchema = z.string().transform((value) => value.toUpperCase()).pipe(z.enum(["STANDARD", "DELUXE", "SUITE"]));

export const createHotelSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().min(2),
  country: z.string().min(2),
  amenities: z.array(z.string()).default([]),
  isActive: z.boolean().optional()
});

export const patchHotelSchema = createHotelSchema.partial().extend({
  approvalStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional()
});

export const createRoomSchema = z.object({
  roomNumber: z.string().min(1),
  type: roomTypeSchema,
  capacity: z.number().int().positive(),
  pricePerNight: z.number().positive(),
  amenities: z.array(z.string()).default([]),
  isActive: z.boolean().optional()
});

export const patchRoomSchema = createRoomSchema.partial();

export const createAdminSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional()
});

export const updateRoleSchema = z.object({
  role: z.enum([Roles.USER, Roles.ADMIN, Roles.SUPERADMIN])
});
