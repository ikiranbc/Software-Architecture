import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, index: true },
    eventType: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    payload: mongoose.Schema.Types.Mixed,
    delivered: { type: Boolean, default: false }
  },
  { timestamps: true }
);

notificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
