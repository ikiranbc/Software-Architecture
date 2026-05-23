import { hashPassword, httpError } from "@hotel-booking/shared-utils";
import { normalizeRole, normalizeStatus, Roles, UserStatuses } from "@hotel-booking/rbac";
import {
  aggregatePlatformSummary,
  aggregateRevenue,
  createAuditLog,
  createHotel,
  createRoom,
  deactivateRoomsByHotelId,
  createUser,
  findHotelById,
  findRoomById,
  findUserByEmail,
  findUserById,
  invalidateHotelListCache,
  listAuditLogs,
  listBookings,
  listHotels,
  listRooms,
  listTransactions,
  listUsers,
  updateHotelById,
  updateRoomById,
  updateUserById
} from "../repositories/admin.repository.js";

function toIdString(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value.toString === "function") return value.toString();
  return null;
}

function serializeUser(user) {
  return {
    id: toIdString(user?._id),
    name: user.name,
    email: user.email,
    role: normalizeRole(user.role),
    phone: user.phone,
    status: normalizeStatus(user.status),
    createdAt: user.createdAt
  };
}

function serializeHotel(hotel) {
  return {
    id: toIdString(hotel?._id),
    ownerId: toIdString(hotel?.ownerId),
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
    createdAt: hotel.createdAt
  };
}

function serializeRoom(room) {
  return {
    id: toIdString(room?._id),
    hotelId: toIdString(room?.hotelId),
    roomNumber: room.roomNumber,
    type: room.type,
    capacity: room.capacity,
    pricePerNight: room.pricePerNight,
    amenities: room.amenities,
    isActive: room.isActive,
    createdAt: room.createdAt
  };
}

function serializeBooking(booking) {
  return {
    id: toIdString(booking?._id),
    userId: toIdString(booking?.userId),
    ownerId: toIdString(booking?.ownerId),
    hotelId: toIdString(booking?.hotelId),
    roomId: toIdString(booking?.roomId),
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    nights: booking.nights,
    guests: booking.guests,
    totalAmount: booking.totalAmount,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    failureReason: booking.failureReason,
    createdAt: booking.createdAt
  };
}

function serializeTransaction(transaction) {
  return {
    id: toIdString(transaction?._id),
    walletId: toIdString(transaction?.walletId),
    bookingId: toIdString(transaction?.bookingId),
    type: transaction.type,
    amount: transaction.amount,
    status: transaction.status,
    reference: transaction.reference,
    idempotencyKey: transaction.idempotencyKey,
    metadata: transaction.metadata,
    createdAt: transaction.createdAt
  };
}

function serializeAuditLog(log) {
  return {
    id: toIdString(log?._id),
    actorId: toIdString(log?.actorId),
    actorRole: log.actorRole,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    oldValue: log.oldValue,
    newValue: log.newValue,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt
  };
}

async function writeAudit(action, targetType, targetId, oldValue, newValue, audit) {
  await createAuditLog({
    actorId: audit.actorId,
    actorRole: audit.actorRole,
    action,
    targetType,
    targetId,
    oldValue,
    newValue,
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent
  });
}

function ensureAdminHotelAccess(hotel, user) {
  if (user.role === Roles.SUPERADMIN) return;
  if (toIdString(hotel?.ownerId) !== user.id) {
    throw httpError(403, "You cannot manage this hotel", "FORBIDDEN");
  }
}

export async function createAdminHotel(user, payload, audit) {
  const hotel = await createHotel({
    ownerId: user.id,
    ...payload,
    approvalStatus: "APPROVED",
    isActive: payload.isActive ?? true
  });
  await writeAudit("ADMIN_HOTEL_CREATE", "HOTEL", hotel._id.toString(), null, serializeHotel(hotel), audit);
  await invalidateHotelListCache();
  return serializeHotel(hotel);
}

export async function listAdminHotels(user) {
  const query = user.role === Roles.SUPERADMIN ? {} : { ownerId: user.id };
  const hotels = await listHotels(query);
  return { data: hotels.map(serializeHotel) };
}

export async function patchAdminHotel(user, hotelId, payload, audit) {
  const hotel = await findHotelById(hotelId);
  if (!hotel) throw httpError(404, "Hotel not found", "HOTEL_NOT_FOUND");
  ensureAdminHotelAccess(hotel, user);

  const oldValue = serializeHotel(hotel);
  const updated = await updateHotelById(hotelId, payload);
  await writeAudit("ADMIN_HOTEL_UPDATE", "HOTEL", hotelId, oldValue, serializeHotel(updated), audit);
  await invalidateHotelListCache();
  return serializeHotel(updated);
}

export async function deleteAdminHotel(user, hotelId, audit) {
  const hotel = await findHotelById(hotelId);
  if (!hotel || !hotel.isActive) throw httpError(404, "Hotel not found", "HOTEL_NOT_FOUND");
  ensureAdminHotelAccess(hotel, user);

  const oldValue = serializeHotel(hotel);
  const updated = await updateHotelById(hotelId, { isActive: false });
  await deactivateRoomsByHotelId(hotelId);
  await writeAudit("ADMIN_HOTEL_DELETE", "HOTEL", hotelId, oldValue, serializeHotel(updated), audit);
  await invalidateHotelListCache();
  return { ok: true };
}

export async function createAdminRoom(user, hotelId, payload, audit) {
  const hotel = await findHotelById(hotelId);
  if (!hotel) throw httpError(404, "Hotel not found", "HOTEL_NOT_FOUND");
  ensureAdminHotelAccess(hotel, user);

  const room = await createRoom({ hotelId, ...payload, isActive: payload.isActive ?? true });
  await writeAudit("ADMIN_ROOM_CREATE", "ROOM", room._id.toString(), null, serializeRoom(room), audit);
  await invalidateHotelListCache();
  return serializeRoom(room);
}

export async function listAdminHotelRooms(user, hotelId) {
  const hotel = await findHotelById(hotelId);
  if (!hotel) throw httpError(404, "Hotel not found", "HOTEL_NOT_FOUND");
  ensureAdminHotelAccess(hotel, user);
  const rooms = await listRooms({ hotelId });
  return { data: rooms.map(serializeRoom) };
}

export async function patchAdminRoom(user, roomId, payload, audit) {
  const room = await findRoomById(roomId);
  if (!room) throw httpError(404, "Room not found", "ROOM_NOT_FOUND");

  const hotel = await findHotelById(room.hotelId);
  if (!hotel) throw httpError(404, "Hotel not found", "HOTEL_NOT_FOUND");
  ensureAdminHotelAccess(hotel, user);

  const oldValue = serializeRoom(room);
  const updated = await updateRoomById(roomId, payload);
  await writeAudit("ADMIN_ROOM_UPDATE", "ROOM", roomId, oldValue, serializeRoom(updated), audit);
  await invalidateHotelListCache();
  return serializeRoom(updated);
}

export async function deleteAdminRoom(user, roomId, audit) {
  const room = await findRoomById(roomId);
  if (!room || !room.isActive) throw httpError(404, "Room not found", "ROOM_NOT_FOUND");

  const hotel = await findHotelById(room.hotelId);
  if (!hotel) throw httpError(404, "Hotel not found", "HOTEL_NOT_FOUND");
  ensureAdminHotelAccess(hotel, user);

  const oldValue = serializeRoom(room);
  const updated = await updateRoomById(roomId, { isActive: false });
  await writeAudit("ADMIN_ROOM_DELETE", "ROOM", roomId, oldValue, serializeRoom(updated), audit);
  await invalidateHotelListCache();
  return { ok: true };
}

export async function listAdminBookings(user) {
  if (user.role === Roles.SUPERADMIN) {
    const bookings = await listBookings();
    return { data: bookings.map(serializeBooking) };
  }

  const hotels = await listHotels({ ownerId: user.id });
  const hotelIds = hotels.map((hotel) => hotel._id);
  const bookings = await listBookings({ hotelId: { $in: hotelIds } });
  return { data: bookings.map(serializeBooking) };
}

export async function getAdminRevenue(user) {
  const match = user.role === Roles.SUPERADMIN ? {} : { ownerId: user.id };
  const summary = await aggregateRevenue(match);
  const grossRevenue = summary.reduce((acc, item) => acc + item.grossRevenue, 0);
  const totalBookings = summary.reduce((acc, item) => acc + item.bookings, 0);

  return {
    grossRevenue,
    totalBookings,
    byHotel: summary.map((item) => ({
      hotelId: item._id?.toString(),
      bookings: item.bookings,
      grossRevenue: item.grossRevenue
    }))
  };
}

export async function listSuperAdminUsers() {
  const users = await listUsers();
  return { data: users.map(serializeUser) };
}

export async function createSuperAdminAdmin(payload, audit) {
  const existing = await findUserByEmail(payload.email);
  if (existing) throw httpError(409, "Email is already registered", "EMAIL_EXISTS");

  const user = await createUser({
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    role: Roles.ADMIN,
    status: UserStatuses.ACTIVE,
    passwordHash: await hashPassword(payload.password)
  });

  await writeAudit("SUPERADMIN_ADMIN_CREATE", "USER", user._id.toString(), null, serializeUser(user), audit);
  return serializeUser(user);
}

export async function blockUserById(userId, audit) {
  const user = await findUserById(userId);
  if (!user) throw httpError(404, "User not found", "USER_NOT_FOUND");
  const oldValue = serializeUser(user);
  const updated = await updateUserById(userId, { status: UserStatuses.BLOCKED });
  await writeAudit("SUPERADMIN_USER_BLOCK", "USER", userId, oldValue, serializeUser(updated), audit);
  return serializeUser(updated);
}

export async function unblockUserById(userId, audit) {
  const user = await findUserById(userId);
  if (!user) throw httpError(404, "User not found", "USER_NOT_FOUND");
  const oldValue = serializeUser(user);
  const updated = await updateUserById(userId, { status: UserStatuses.ACTIVE });
  await writeAudit("SUPERADMIN_USER_UNBLOCK", "USER", userId, oldValue, serializeUser(updated), audit);
  return serializeUser(updated);
}

export async function updateUserRoleById(userId, role, audit) {
  const user = await findUserById(userId);
  if (!user) throw httpError(404, "User not found", "USER_NOT_FOUND");
  const oldValue = serializeUser(user);
  const updated = await updateUserById(userId, { role });
  await writeAudit("SUPERADMIN_USER_ROLE_UPDATE", "USER", userId, oldValue, serializeUser(updated), audit);
  return serializeUser(updated);
}

export async function listSuperAdminHotels() {
  const hotels = await listHotels();
  return { data: hotels.map(serializeHotel) };
}

export async function approveHotelById(hotelId, audit) {
  const hotel = await findHotelById(hotelId);
  if (!hotel) throw httpError(404, "Hotel not found", "HOTEL_NOT_FOUND");
  const oldValue = serializeHotel(hotel);
  const updated = await updateHotelById(hotelId, { approvalStatus: "APPROVED", isActive: true });
  await writeAudit("SUPERADMIN_HOTEL_APPROVE", "HOTEL", hotelId, oldValue, serializeHotel(updated), audit);
  return serializeHotel(updated);
}

export async function rejectHotelById(hotelId, audit) {
  const hotel = await findHotelById(hotelId);
  if (!hotel) throw httpError(404, "Hotel not found", "HOTEL_NOT_FOUND");
  const oldValue = serializeHotel(hotel);
  const updated = await updateHotelById(hotelId, { approvalStatus: "REJECTED", isActive: false });
  await writeAudit("SUPERADMIN_HOTEL_REJECT", "HOTEL", hotelId, oldValue, serializeHotel(updated), audit);
  return serializeHotel(updated);
}

export async function listSuperAdminBookings() {
  const bookings = await listBookings();
  return { data: bookings.map(serializeBooking) };
}

export async function listSuperAdminTransactions() {
  const transactions = await listTransactions();
  return { data: transactions.map(serializeTransaction) };
}

export async function getSuperAdminReports() {
  const [summaryDoc] = await aggregatePlatformSummary();
  const data = summaryDoc || {
    totalBookings: 0,
    confirmedBookings: 0,
    failedPayments: 0,
    platformRevenue: 0
  };

  return {
    totalBookings: data.totalBookings || 0,
    confirmedBookings: data.confirmedBookings || 0,
    failedPayments: data.failedPayments || 0,
    duplicateBookingAttempts: 0,
    platformRevenue: data.platformRevenue || 0
  };
}

export async function getSuperAdminAuditLogs() {
  const logs = await listAuditLogs();
  return { data: logs.map(serializeAuditLog) };
}
