import { AuditLog } from "../models/audit-log.model.js";
import { Booking } from "../models/booking.model.js";
import { Hotel } from "../models/hotel.model.js";
import { Room } from "../models/room.model.js";
import { Transaction } from "../models/transaction.model.js";
import { User } from "../models/user.model.js";

export function createHotel(payload) {
  return Hotel.create(payload);
}

export function findHotelById(hotelId) {
  return Hotel.findById(hotelId);
}

export function updateHotelById(hotelId, payload) {
  return Hotel.findByIdAndUpdate(hotelId, payload, { new: true });
}

export function listHotels(query = {}) {
  return Hotel.find(query).sort({ createdAt: -1 });
}

export function createRoom(payload) {
  return Room.create(payload);
}

export function findRoomById(roomId) {
  return Room.findById(roomId);
}

export function updateRoomById(roomId, payload) {
  return Room.findByIdAndUpdate(roomId, payload, { new: true });
}

export function listRooms(query = {}) {
  return Room.find(query).sort({ createdAt: -1 });
}

export function listBookings(query = {}) {
  return Booking.find(query).sort({ createdAt: -1 }).limit(500);
}

export function aggregateRevenue(match = {}) {
  return Booking.aggregate([
    { $match: { status: "CONFIRMED", ...match } },
    {
      $group: {
        _id: "$hotelId",
        bookings: { $sum: 1 },
        grossRevenue: { $sum: "$totalAmount" }
      }
    },
    { $sort: { grossRevenue: -1 } }
  ]);
}

export function aggregatePlatformSummary() {
  return Booking.aggregate([
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        confirmedBookings: {
          $sum: {
            $cond: [{ $eq: ["$status", "CONFIRMED"] }, 1, 0]
          }
        },
        failedPayments: {
          $sum: {
            $cond: [{ $eq: ["$paymentStatus", "FAILED"] }, 1, 0]
          }
        },
        platformRevenue: {
          $sum: {
            $cond: [{ $eq: ["$status", "CONFIRMED"] }, "$totalAmount", 0]
          }
        }
      }
    }
  ]);
}

export function listTransactions(query = {}) {
  return Transaction.find(query).sort({ createdAt: -1 }).limit(1000);
}

export function findUserByEmail(email) {
  return User.findOne({ email });
}

export function findUserById(userId) {
  return User.findById(userId);
}

export function listUsers(query = {}) {
  return User.find(query).sort({ createdAt: -1 }).limit(1000);
}

export function createUser(payload) {
  return User.create(payload);
}

export function updateUserById(userId, payload) {
  return User.findByIdAndUpdate(userId, payload, { new: true });
}

export function createAuditLog(payload) {
  return AuditLog.create(payload);
}

export function listAuditLogs(query = {}) {
  return AuditLog.find(query).sort({ createdAt: -1 }).limit(1000);
}
