import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/hotel_booking";

const hotelSchema = new mongoose.Schema(
  {
    isActive: Boolean,
    approvalStatus: String
  },
  { timestamps: true }
);

const roomSchema = new mongoose.Schema(
  {
    isActive: Boolean
  },
  { timestamps: true }
);

const Hotel = mongoose.models.Hotel || mongoose.model("Hotel", hotelSchema);
const Room = mongoose.models.Room || mongoose.model("Room", roomSchema);

await mongoose.connect(MONGO_URI);

const hotels = await Hotel.updateMany(
  {},
  {
    $set: {
      isActive: true,
      approvalStatus: "APPROVED"
    }
  }
);

const rooms = await Room.updateMany(
  {},
  {
    $set: { isActive: true }
  }
);

console.log(`Activated ${hotels.modifiedCount || 0} hotel(s) and ${rooms.modifiedCount || 0} room(s).`);
await mongoose.disconnect();
