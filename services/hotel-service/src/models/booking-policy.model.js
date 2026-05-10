/**
 * Model Layer (Persistence Model / Data Mapper boundary):
 * - Defines database schema, indexes, and persistence constraints.
 * - Isolated from HTTP concerns to keep boundaries clean.
 */

import mongoose from "mongoose";

// Read-only booking projection used for inventory policy checks in this service.
const bookingPolicySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    status: { type: String, index: true }
  },
  { collection: "bookings", strict: false, versionKey: false }
);

export const BookingPolicy = mongoose.models.BookingPolicy || mongoose.model("BookingPolicy", bookingPolicySchema);
