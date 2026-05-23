/**
 * Route Layer (Router + Middleware Composition pattern):
 * - Admin and SuperAdmin APIs in one boundary.
 */

import { Router } from "express";
import { asyncHandler, requireUser, validateBody } from "@hotel-booking/shared-utils";
import * as adminController from "../controllers/admin.controller.js";
import {
  createAdminSchema,
  createHotelSchema,
  createRoomSchema,
  patchHotelSchema,
  patchRoomSchema,
  updateRoleSchema
} from "../dto/admin.dto.js";
import { requireAdminRole, requireSuperAdminRole } from "../middlewares/admin.middleware.js";

const router = Router();

router.post("/api/admin/hotels", requireUser, requireAdminRole, validateBody(createHotelSchema), asyncHandler(adminController.createHotel));
router.get("/api/admin/hotels", requireUser, requireAdminRole, asyncHandler(adminController.listHotels));
router.patch("/api/admin/hotels/:hotelId", requireUser, requireAdminRole, validateBody(patchHotelSchema), asyncHandler(adminController.patchHotel));
router.delete("/api/admin/hotels/:hotelId", requireUser, requireAdminRole, asyncHandler(adminController.removeHotel));
router.post("/api/admin/hotels/:hotelId/rooms", requireUser, requireAdminRole, validateBody(createRoomSchema), asyncHandler(adminController.createRoom));
router.get("/api/admin/hotels/:hotelId/rooms", requireUser, requireAdminRole, asyncHandler(adminController.listHotelRooms));
router.patch("/api/admin/rooms/:roomId", requireUser, requireAdminRole, validateBody(patchRoomSchema), asyncHandler(adminController.patchRoom));
router.delete("/api/admin/rooms/:roomId", requireUser, requireAdminRole, asyncHandler(adminController.removeRoom));
router.get("/api/admin/bookings", requireUser, requireAdminRole, asyncHandler(adminController.listBookings));
router.get("/api/admin/revenue", requireUser, requireAdminRole, asyncHandler(adminController.revenue));

router.get("/api/superadmin/users", requireUser, requireSuperAdminRole, asyncHandler(adminController.listUsers));
router.post("/api/superadmin/admins", requireUser, requireSuperAdminRole, validateBody(createAdminSchema), asyncHandler(adminController.createAdmin));
router.patch("/api/superadmin/users/:userId/block", requireUser, requireSuperAdminRole, asyncHandler(adminController.blockUser));
router.patch("/api/superadmin/users/:userId/unblock", requireUser, requireSuperAdminRole, asyncHandler(adminController.unblockUser));
router.patch("/api/superadmin/users/:userId/role", requireUser, requireSuperAdminRole, validateBody(updateRoleSchema), asyncHandler(adminController.updateUserRole));
router.get("/api/superadmin/hotels", requireUser, requireSuperAdminRole, asyncHandler(adminController.listSuperAdminHotels));
router.patch("/api/superadmin/hotels/:hotelId/approve", requireUser, requireSuperAdminRole, asyncHandler(adminController.approveHotel));
router.patch("/api/superadmin/hotels/:hotelId/reject", requireUser, requireSuperAdminRole, asyncHandler(adminController.rejectHotel));
router.get("/api/superadmin/bookings", requireUser, requireSuperAdminRole, asyncHandler(adminController.listAllBookings));
router.get("/api/superadmin/transactions", requireUser, requireSuperAdminRole, asyncHandler(adminController.listTransactions));
router.get("/api/superadmin/reports", requireUser, requireSuperAdminRole, asyncHandler(adminController.reports));
router.get("/api/superadmin/audit-logs", requireUser, requireSuperAdminRole, asyncHandler(adminController.auditLogs));

export default router;
