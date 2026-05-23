import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/hotel_booking";

const hotelSchema = new mongoose.Schema(
  {
    isActive: Boolean,
    approvalStatus: String
  },
  { timestamps: true }
);

const Hotel = mongoose.models.Hotel || mongoose.model("Hotel", hotelSchema);

await mongoose.connect(MONGO_URI);
const result = await Hotel.updateMany(
  {
    isActive: true,
    approvalStatus: { $in: ["PENDING", "pending", null, undefined] }
  },
  {
    $set: { approvalStatus: "APPROVED" }
  }
);

console.log(`Approved ${result.modifiedCount || 0} active hotel(s).`);
await mongoose.disconnect();
