import mongoose from "mongoose";
import { normalizeRole, normalizeStatus, Roles, UserStatuses } from "@hotel-booking/rbac";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: Object.values(Roles), default: Roles.USER, index: true, set: normalizeRole },
    phone: String,
    status: { type: String, enum: Object.values(UserStatuses), default: UserStatuses.ACTIVE, index: true, set: normalizeStatus }
  },
  { timestamps: true }
);

userSchema.index({ role: 1, status: 1 });

export const User = mongoose.models.User || mongoose.model("User", userSchema);
