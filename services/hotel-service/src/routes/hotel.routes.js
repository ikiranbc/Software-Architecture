/**
 * Route Layer (Router + Middleware Composition pattern):
 * - Maps transport paths to controllers.
 * - Composes middleware pipeline explicitly per endpoint.
 */

import { Router } from "express";
import { asyncHandler, requireUser, validateBody } from "@hotel-booking/shared-utils";
import * as hotelController from "../controllers/hotel.controller.js";
import { createHotelSchema, createRoomSchema, updateHotelSchema, updateRoomSchema } from "../dto/hotel.dto.js";
import { normalizeHotelQuery, requireInventoryRole } from "../middlewares/inventory.middleware.js";

const router = Router();

router.get("/api/hotels", normalizeHotelQuery, asyncHandler(hotelController.listHotels));
router.get("/api/hotels/:hotelId", asyncHandler(hotelController.getHotel));
router.get("/api/hotels/:hotelId/rooms", normalizeHotelQuery, asyncHandler(hotelController.listHotelRooms));
router.get("/internal/rooms/:roomId", asyncHandler(hotelController.getInternalRoom));

router.post("/api/owner/hotels", requireUser, requireInventoryRole, validateBody(createHotelSchema), asyncHandler(hotelController.createHotel));
router.get("/api/owner/hotels", requireUser, requireInventoryRole, asyncHandler(hotelController.listOwnedHotels));
router.patch("/api/owner/hotels/:hotelId", requireUser, requireInventoryRole, validateBody(updateHotelSchema), asyncHandler(hotelController.patchHotel));
router.delete("/api/owner/hotels/:hotelId", requireUser, requireInventoryRole, asyncHandler(hotelController.removeHotel));
router.get("/api/owner/hotels/:hotelId/rooms", requireUser, requireInventoryRole, asyncHandler(hotelController.listOwnedHotelRooms));
router.post("/api/owner/hotels/:hotelId/rooms", requireUser, requireInventoryRole, validateBody(createRoomSchema), asyncHandler(hotelController.createRoom));
router.patch("/api/owner/rooms/:roomId", requireUser, requireInventoryRole, validateBody(updateRoomSchema), asyncHandler(hotelController.patchRoom));
router.delete("/api/owner/rooms/:roomId", requireUser, requireInventoryRole, asyncHandler(hotelController.removeRoom));

export default router;
