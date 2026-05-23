import * as adminService from "../services/admin.service.js";
import { auditContext } from "../middlewares/admin.middleware.js";

export async function createHotel(req, res) {
  const payload = await adminService.createAdminHotel(req.user, req.body, auditContext(req));
  res.status(201).json(payload);
}

export async function listHotels(req, res) {
  const payload = await adminService.listAdminHotels(req.user);
  res.json(payload);
}

export async function patchHotel(req, res) {
  const payload = await adminService.patchAdminHotel(req.user, req.params.hotelId, req.body, auditContext(req));
  res.json(payload);
}

export async function removeHotel(req, res) {
  const payload = await adminService.deleteAdminHotel(req.user, req.params.hotelId, auditContext(req));
  res.json(payload);
}

export async function createRoom(req, res) {
  const payload = await adminService.createAdminRoom(req.user, req.params.hotelId, req.body, auditContext(req));
  res.status(201).json(payload);
}

export async function listHotelRooms(req, res) {
  const payload = await adminService.listAdminHotelRooms(req.user, req.params.hotelId);
  res.json(payload);
}

export async function patchRoom(req, res) {
  const payload = await adminService.patchAdminRoom(req.user, req.params.roomId, req.body, auditContext(req));
  res.json(payload);
}

export async function removeRoom(req, res) {
  const payload = await adminService.deleteAdminRoom(req.user, req.params.roomId, auditContext(req));
  res.json(payload);
}

export async function listBookings(req, res) {
  const payload = await adminService.listAdminBookings(req.user);
  res.json(payload);
}

export async function revenue(req, res) {
  const payload = await adminService.getAdminRevenue(req.user);
  res.json(payload);
}

export async function listUsers(_req, res) {
  const payload = await adminService.listSuperAdminUsers();
  res.json(payload);
}

export async function createAdmin(req, res) {
  const payload = await adminService.createSuperAdminAdmin(req.body, auditContext(req));
  res.status(201).json(payload);
}

export async function blockUser(req, res) {
  const payload = await adminService.blockUserById(req.params.userId, auditContext(req));
  res.json(payload);
}

export async function unblockUser(req, res) {
  const payload = await adminService.unblockUserById(req.params.userId, auditContext(req));
  res.json(payload);
}

export async function updateUserRole(req, res) {
  const payload = await adminService.updateUserRoleById(req.params.userId, req.body.role, auditContext(req));
  res.json(payload);
}

export async function listSuperAdminHotels(_req, res) {
  const payload = await adminService.listSuperAdminHotels();
  res.json(payload);
}

export async function approveHotel(req, res) {
  const payload = await adminService.approveHotelById(req.params.hotelId, auditContext(req));
  res.json(payload);
}

export async function rejectHotel(req, res) {
  const payload = await adminService.rejectHotelById(req.params.hotelId, auditContext(req));
  res.json(payload);
}

export async function listAllBookings(_req, res) {
  const payload = await adminService.listSuperAdminBookings();
  res.json(payload);
}

export async function listTransactions(_req, res) {
  const payload = await adminService.listSuperAdminTransactions();
  res.json(payload);
}

export async function reports(_req, res) {
  const payload = await adminService.getSuperAdminReports();
  res.json(payload);
}

export async function auditLogs(_req, res) {
  const payload = await adminService.getSuperAdminAuditLogs();
  res.json(payload);
}
