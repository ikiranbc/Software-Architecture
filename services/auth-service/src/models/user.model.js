/**
 * Model Layer (Persistence Model / Data Mapper boundary):
 * - Defines database schema, indexes, and persistence constraints.
 * - Isolated from HTTP concerns to keep boundaries clean.
 */

import mongoose from "mongoose";
import { normalizeRole, normalizeStatus, Roles, UserStatuses } from "@hotel-booking/rbac";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: Object.values(Roles), default: Roles.USER, index: true, set: normalizeRole },
    phone: String,
    status: { type: String, enum: Object.values(UserStatuses), default: UserStatuses.ACTIVE, set: normalizeStatus }
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model("User", userSchema);
