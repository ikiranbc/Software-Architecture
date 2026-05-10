/**
 * Repository Layer (Repository pattern):
 * - Encapsulates data access/query details behind stable methods.
 * - Supports Dependency Inversion by decoupling services from storage specifics.
 */

import { getRedis } from "@hotel-booking/shared-utils";
import { BookingPolicy } from "../models/booking-policy.model.js";
import { Hotel } from "../models/hotel.model.js";
import { Room } from "../models/room.model.js";

export function findHotels(query, { page, limit, sort = { ratingAvg: -1, createdAt: -1 } }) {
  return Hotel.find(query)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);
}

export function countHotels(query) {
  return Hotel.countDocuments(query);
}

export function findHotelById(hotelId) {
  return Hotel.findById(hotelId);
}

export function findRooms(query, sort = { pricePerNight: 1 }) {
  return Room.find(query).sort(sort);
}

export function findRoomById(roomId) {
  return Room.findById(roomId);
}

export function createHotel(payload) {
  return Hotel.create(payload);
}

export function createRoom(payload) {
  return Room.create(payload);
}

export function deactivateRoomsByHotelId(hotelId) {
  return Room.updateMany({ hotelId }, { isActive: false });
}

export async function hasPendingPaymentBooking(userId) {
  const booking = await BookingPolicy.exists({
    userId,
    status: "PENDING_PAYMENT"
  });
  return Boolean(booking);
}

export function makeHotelListCacheKey(query) {
  return `hotels:list:${Buffer.from(JSON.stringify(query)).toString("base64url")}`;
}

export async function readHotelListCache(cacheKey) {
  try {
    const cached = await getRedis().get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn(`Hotel cache read skipped: ${error.message}`);
    return null;
  }
}

export async function writeHotelListCache(cacheKey, payload, ttlSeconds = 120) {
  try {
    await getRedis().set(cacheKey, JSON.stringify(payload), "EX", ttlSeconds);
  } catch (error) {
    console.warn(`Hotel cache write skipped: ${error.message}`);
  }
}

export async function invalidateHotelListCache() {
  try {
    const redis = getRedis();
    const keys = await redis.keys("hotels:list:*");
    if (keys.length > 0) await redis.del(keys);
  } catch (error) {
    console.warn(`Hotel cache invalidation skipped: ${error.message}`);
  }
}
