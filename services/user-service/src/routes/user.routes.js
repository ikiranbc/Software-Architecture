/**
 * Route Layer (Router + Middleware Composition pattern):
 * - Maps transport paths to controllers.
 * - Composes middleware pipeline explicitly per endpoint.
 */

import { Router } from "express";
import { asyncHandler, requireRoles, requireUser, validateBody } from "@hotel-booking/shared-utils";
import * as userController from "../controllers/user.controller.js";
import { updateProfileSchema } from "../dto/user.dto.js";
import { normalizeProfileBody } from "../middlewares/user.middleware.js";

const router = Router();

router.get("/me", requireUser, asyncHandler(userController.getMe));
router.patch("/me", requireUser, normalizeProfileBody, validateBody(updateProfileSchema), asyncHandler(userController.patchMe));
router.get("/:userId", requireUser, requireRoles("ADMIN", "SUPERADMIN"), asyncHandler(userController.getUser));

export default router;
