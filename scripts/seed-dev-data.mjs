import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/hotel_booking";
const MAX_RETRIES = 20;
const RETRY_DELAY_MS = 1500;

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, lowercase: true, trim: true, index: true },
    passwordHash: String,
    role: String,
    phone: String,
    status: String
  },
  { timestamps: true }
);

const hotelSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    name: String,
    description: String,
    address: String,
    city: String,
    country: String,
    amenities: [String],
    ratingAvg: Number,
    ratingCount: Number,
    isActive: Boolean,
    approvalStatus: String
  },
  { timestamps: true }
);

const roomSchema = new mongoose.Schema(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    roomNumber: String,
    type: String,
    capacity: Number,
    pricePerNight: Number,
    amenities: [String],
    isActive: Boolean
  },
  { timestamps: true }
);

const walletSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    version: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
const Hotel = mongoose.models.Hotel || mongoose.model("Hotel", hotelSchema);
const Room = mongoose.models.Room || mongoose.model("Room", roomSchema);
const Wallet = mongoose.models.Wallet || mongoose.model("Wallet", walletSchema);

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry() {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      await mongoose.connect(MONGO_URI);
      return;
    } catch (error) {
      lastError = error;
      console.log(`[seed] waiting for MongoDB (${attempt}/${MAX_RETRIES})`);
      await sleep(RETRY_DELAY_MS);
    }
  }
  throw lastError;
}

async function upsertUser({ name, email, password, role, phone = "" }) {
  const normalizedEmail = email.toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);
  await User.updateOne(
    { email: normalizedEmail },
    {
      $set: {
        name,
        role,
        phone,
        status: "ACTIVE",
        passwordHash
      },
      $setOnInsert: { email: normalizedEmail }
    },
    { upsert: true }
  );
  return User.findOne({ email: normalizedEmail });
}

async function ensureWallet(userId, balance) {
  await Wallet.updateOne(
    { userId },
    {
      $set: { currency: "USD" },
      $max: { balance },
      $setOnInsert: { userId, version: 0 }
    },
    { upsert: true }
  );
}

async function ensureHotel(ownerId, payload) {
  let hotel = await Hotel.findOne({
    ownerId,
    name: payload.name,
    city: payload.city,
    country: payload.country
  });

  if (!hotel) {
    hotel = await Hotel.create({
      ownerId,
      ...payload,
      isActive: true,
      approvalStatus: payload.approvalStatus || "APPROVED",
      ratingAvg: payload.ratingAvg ?? 0,
      ratingCount: payload.ratingCount ?? 0
    });
  } else {
    Object.assign(hotel, { ...payload, isActive: true, approvalStatus: payload.approvalStatus || "APPROVED" });
    await hotel.save();
  }

  return hotel;
}

async function ensureRoom(hotelId, payload) {
  let room = await Room.findOne({ hotelId, roomNumber: payload.roomNumber });
  if (!room) {
    room = await Room.create({
      hotelId,
      ...payload,
      isActive: true
    });
    return;
  }

  Object.assign(room, { ...payload, isActive: true });
  await room.save();
}

async function main() {
  await connectWithRetry();

  const accounts = [
    { name: "Platform Superadmin", email: "superadmin@hotel.local", password: "SuperAdmin@123", role: "SUPERADMIN" },
    { name: "Operations Admin", email: "admin@hotel.local", password: "Admin@12345", role: "ADMIN" },
    { name: "Standard User", email: "user@hotel.local", password: "User@12345", role: "USER" }
  ];

  const users = {};
  for (const account of accounts) {
    const user = await upsertUser(account);
    users[account.role] = user;
    console.log(`[seed] ensured user ${account.email}`);
  }

  await ensureWallet(users.USER._id, 900);
  await ensureWallet(users.ADMIN._id, 1200);
  await ensureWallet(users.SUPERADMIN._id, 1500);

  const demoHotels = [
    {
      ownerId: users.ADMIN._id,
      name: "Sunset Harbor Hotel",
      description: "Waterfront stays with quick city access.",
      address: "101 Ocean Avenue",
      city: "Miami",
      country: "USA",
      amenities: ["pool", "wifi", "gym", "breakfast"],
      approvalStatus: "APPROVED",
      ratingAvg: 4.6,
      ratingCount: 214,
      rooms: [
        { roomNumber: "101", type: "STANDARD", capacity: 2, pricePerNight: 140, amenities: ["wifi", "queen-bed"] },
        { roomNumber: "201", type: "DELUXE", capacity: 3, pricePerNight: 210, amenities: ["balcony", "wifi", "mini-bar"] },
        { roomNumber: "301", type: "SUITE", capacity: 4, pricePerNight: 320, amenities: ["sea-view", "living-room", "wifi"] }
      ]
    },
    {
      ownerId: users.ADMIN._id,
      name: "Mountain Crest Inn",
      description: "Quiet hilltop retreat with panoramic views.",
      address: "22 Pine Ridge Road",
      city: "Denver",
      country: "USA",
      amenities: ["parking", "wifi", "spa"],
      approvalStatus: "APPROVED",
      ratingAvg: 4.4,
      ratingCount: 129,
      rooms: [
        { roomNumber: "A1", type: "STANDARD", capacity: 2, pricePerNight: 120, amenities: ["wifi", "desk"] },
        { roomNumber: "B7", type: "DELUXE", capacity: 3, pricePerNight: 185, amenities: ["view", "coffee-machine"] }
      ]
    },
    {
      ownerId: users.SUPERADMIN._id,
      name: "City Central Suites",
      description: "Business-friendly suites near downtown transit.",
      address: "550 Market Street",
      city: "San Francisco",
      country: "USA",
      amenities: ["wifi", "workspace", "parking"],
      approvalStatus: "APPROVED",
      ratingAvg: 4.3,
      ratingCount: 87,
      rooms: [
        { roomNumber: "1205", type: "DELUXE", capacity: 2, pricePerNight: 240, amenities: ["workspace", "smart-tv"] },
        { roomNumber: "1402", type: "SUITE", capacity: 4, pricePerNight: 360, amenities: ["city-view", "sofa", "wifi"] }
      ]
    }
  ];

  for (const hotelData of demoHotels) {
    const { ownerId, rooms, ...hotelPayload } = hotelData;
    const hotel = await ensureHotel(ownerId, hotelPayload);
    for (const roomPayload of rooms) {
      await ensureRoom(hotel._id, roomPayload);
    }
    console.log(`[seed] ensured hotel ${hotel.name} with ${rooms.length} rooms`);
  }

  console.log("[seed] dev data ready");
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("[seed] failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
