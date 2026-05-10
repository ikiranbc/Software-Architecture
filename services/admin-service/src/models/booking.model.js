import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    hotelId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    checkInDate: { type: Date, required: true, index: true },
    checkOutDate: { type: Date, required: true, index: true },
    nights: { type: Number, required: true },
    guests: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["PENDING_PAYMENT", "CONFIRMED", "FAILED", "CANCELLED"],
      default: "PENDING_PAYMENT",
      index: true
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PROCESSING", "SUCCESS", "FAILED", "REFUNDED"],
      default: "PENDING",
      index: true
    },
    idempotencyKey: { type: String, required: true, unique: true },
    failureReason: String
  },
  { timestamps: true }
);

bookingSchema.index({ roomId: 1, checkInDate: 1, checkOutDate: 1, status: 1 });

export const Booking = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);
