/**
 * Service Layer (Application Service / Use-Case Interactor pattern):
 * - Implements business rules and orchestration.
 * - Coordinates repositories, policies, and external integrations.
 */

import { httpError } from "@hotel-booking/shared-utils";
import { assertHotelAccess, canManageAcrossOwners } from "../middlewares/inventory.middleware.js";
import {
  countHotels,
  createHotel,
  createRoom,
  deactivateRoomsByHotelId,
  findHotelById,
  findHotels,
  findRoomById,
  findRooms,
  invalidateHotelListCache,
  makeHotelListCacheKey,
  readHotelListCache,
  writeHotelListCache
} from "../repositories/hotel.repository.js";

export function serializeHotel(hotel, rooms = undefined) {
  return {
    id: hotel._id.toString(),
    ownerId: hotel.ownerId.toString(),
    name: hotel.name,
    description: hotel.description,
    address: hotel.address,
    city: hotel.city,
    country: hotel.country,
    amenities: hotel.amenities,
    ratingAvg: hotel.ratingAvg,
    ratingCount: hotel.ratingCount,
    isActive: hotel.isActive,
    approvalStatus: hotel.approvalStatus,
    rooms
  };
}

export function serializeRoom(room) {
  return {
    id: room._id.toString(),
    hotelId: room.hotelId.toString(),
    roomNumber: room.roomNumber,
    type: room.type,
    capacity: room.capacity,
    pricePerNight: room.pricePerNight,
    amenities: room.amenities,
    isActive: room.isActive
  };
}

async function assertCrudAllowedForUserRole(user) {
  // Product rule: USER role cannot manage inventory.
  if (user.role === "USER") {
    throw httpError(403, "USER role cannot manage hotels or rooms", "FORBIDDEN");
  }
}

export async function listPublicHotels(rawQuery) {
  const page = Math.max(Number(rawQuery.page || 1), 1);
  const limit = Math.min(Math.max(Number(rawQuery.limit || 12), 1), 50);
  const guests = rawQuery.guests ? Number(rawQuery.guests) : undefined;
  const cacheKey = makeHotelListCacheKey(rawQuery);
  const cached = await readHotelListCache(cacheKey);
  if (cached) return cached;

  const query = { isActive: true, approvalStatus: "APPROVED" };
  if (rawQuery.city) query.city = new RegExp(`^${rawQuery.city}$`, "i");
  if (rawQuery.country) query.country = new RegExp(`^${rawQuery.country}$`, "i");
  if (rawQuery.search) query.$text = { $search: rawQuery.search };

  const hotels = await findHotels(query, { page, limit });
  const hotelIds = hotels.map((hotel) => hotel._id);

  const roomQuery = { hotelId: { $in: hotelIds }, isActive: true };
  if (guests) roomQuery.capacity = { $gte: guests };
  const rooms = await findRooms(roomQuery, { pricePerNight: 1 });

  const roomsByHotel = new Map();
  for (const room of rooms) {
    const key = room.hotelId.toString();
    roomsByHotel.set(key, [...(roomsByHotel.get(key) || []), serializeRoom(room)]);
  }

  const total = await countHotels(query);
  const payload = {
    data: hotels.map((hotel) => serializeHotel(hotel, roomsByHotel.get(hotel._id.toString()) || [])),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  };

  await writeHotelListCache(cacheKey, payload, 120);
  return payload;
}

export async function getPublicHotel(hotelId) {
  const hotel = await findHotelById(hotelId);
  if (!hotel || !hotel.isActive || hotel.approvalStatus !== "APPROVED") {
    throw httpError(404, "Hotel not found", "HOTEL_NOT_FOUND");
  }
  const rooms = await findRooms({ hotelId: hotel._id, isActive: true }, { pricePerNight: 1 });
  return serializeHotel(hotel, rooms.map(serializeRoom));
}

export async function listPublicHotelRooms(hotelId, rawQuery) {
  const guests = rawQuery.guests ? Number(rawQuery.guests) : undefined;
  const query = { hotelId, isActive: true };
  if (guests) query.capacity = { $gte: guests };
  const rooms = await findRooms(query, { pricePerNight: 1 });
  return { data: rooms.map(serializeRoom) };
}

export async function getInternalRoom(roomId) {
  const room = await findRoomById(roomId);
  if (!room || !room.isActive) throw httpError(404, "Room not found", "ROOM_NOT_FOUND");
  const hotel = await findHotelById(room.hotelId);
  if (!hotel || !hotel.isActive || hotel.approvalStatus !== "APPROVED") {
    throw httpError(404, "Hotel not found", "HOTEL_NOT_FOUND");
  }
  return { room: serializeRoom(room), hotel: serializeHotel(hotel) };
}

export async function createOwnerHotel(user, payload) {
  await assertCrudAllowedForUserRole(user);
  const hotel = await createHotel({ ...payload, ownerId: user.id, approvalStatus: "PENDING" });
  await invalidateHotelListCache();
  return serializeHotel(hotel);
}

export async function listOwnerHotels(user) {
  const query = canManageAcrossOwners(user.role) ? { isActive: true } : { ownerId: user.id, isActive: true };
  const hotels = await findHotels(query, { page: 1, limit: 10_000, sort: { createdAt: -1 } });
  return { data: hotels.map((hotel) => serializeHotel(hotel)) };
}

export async function updateOwnerHotel(user, hotelId, payload) {
  await assertCrudAllowedForUserRole(user);
  const hotel = await findHotelById(hotelId);
  if (!hotel || !hotel.isActive) throw httpError(404, "Hotel not found", "HOTEL_NOT_FOUND");
  assertHotelAccess(hotel, user, "Only the hotel owner can update this hotel");
  Object.assign(hotel, payload);
  await hotel.save();
  await invalidateHotelListCache();
  return serializeHotel(hotel);
}

export async function deleteOwnerHotel(user, hotelId) {
  await assertCrudAllowedForUserRole(user);
  const hotel = await findHotelById(hotelId);
  if (!hotel || !hotel.isActive) throw httpError(404, "Hotel not found", "HOTEL_NOT_FOUND");
  assertHotelAccess(hotel, user, "Only the hotel owner can delete this hotel");
  hotel.isActive = false;
  await hotel.save();
  await deactivateRoomsByHotelId(hotel._id);
  await invalidateHotelListCache();
  return { ok: true };
}

export async function listOwnerHotelRooms(user, hotelId) {
  const hotel = await findHotelById(hotelId);
  if (!hotel || !hotel.isActive) throw httpError(404, "Hotel not found", "HOTEL_NOT_FOUND");
  assertHotelAccess(hotel, user, "Only the hotel owner can view rooms for this hotel");
  const rooms = await findRooms({ hotelId: hotel._id, isActive: true }, { createdAt: -1 });
  return { data: rooms.map(serializeRoom) };
}

export async function createOwnerRoom(user, hotelId, payload) {
  await assertCrudAllowedForUserRole(user);
  const hotel = await findHotelById(hotelId);
  if (!hotel || !hotel.isActive) throw httpError(404, "Hotel not found", "HOTEL_NOT_FOUND");
  assertHotelAccess(hotel, user, "Only the hotel owner can add rooms");
  const room = await createRoom({ ...payload, hotelId: hotel._id });
  await invalidateHotelListCache();
  return serializeRoom(room);
}

export async function updateOwnerRoom(user, roomId, payload) {
  await assertCrudAllowedForUserRole(user);
  const room = await findRoomById(roomId);
  if (!room || !room.isActive) throw httpError(404, "Room not found", "ROOM_NOT_FOUND");
  const hotel = await findHotelById(room.hotelId);
  if (!hotel || !hotel.isActive) throw httpError(404, "Hotel not found", "HOTEL_NOT_FOUND");
  assertHotelAccess(hotel, user, "Only the hotel owner can update this room");
  Object.assign(room, payload);
  await room.save();
  await invalidateHotelListCache();
  return serializeRoom(room);
}

export async function deleteOwnerRoom(user, roomId) {
  await assertCrudAllowedForUserRole(user);
  const room = await findRoomById(roomId);
  if (!room || !room.isActive) throw httpError(404, "Room not found", "ROOM_NOT_FOUND");
  const hotel = await findHotelById(room.hotelId);
  if (!hotel || !hotel.isActive) throw httpError(404, "Hotel not found", "HOTEL_NOT_FOUND");
  assertHotelAccess(hotel, user, "Only the hotel owner can delete this room");
  room.isActive = false;
  await room.save();
  await invalidateHotelListCache();
  return { ok: true };
}
