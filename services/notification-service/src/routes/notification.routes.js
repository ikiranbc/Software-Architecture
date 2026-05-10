import { Router } from "express";
import { asyncHandler, validateQuery } from "@hotel-booking/shared-utils";
import * as notificationController from "../controllers/notification.controller.js";
import { recentNotificationsQuerySchema } from "../dto/notification.dto.js";
import { normalizeNotificationQuery } from "../middlewares/notification.middleware.js";

const router = Router();

router.get(
  "/internal/notifications/recent",
  normalizeNotificationQuery,
  validateQuery(recentNotificationsQuerySchema),
  asyncHandler(notificationController.listRecentNotifications)
);

export default router;
