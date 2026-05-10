import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    roomNumber: { type: String, required: true },
    type: { type: String, enum: ["STANDARD", "DELUXE", "SUITE"], required: true },
    capacity: { type: Number, required: true, min: 1 },
    pricePerNight: { type: Number, required: true, min: 1 },
    amenities: [String],
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

roomSchema.index({ hotelId: 1, roomNumber: 1 }, { unique: true });

export const Room = mongoose.models.Room || mongoose.model("Room", roomSchema);
