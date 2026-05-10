/**
 * Route Layer (Router + Middleware Composition pattern):
 * - Maps transport paths to controllers.
 * - Composes middleware pipeline explicitly per endpoint.
 */

import { Router } from "express";
import { asyncHandler, validateBody } from "@hotel-booking/shared-utils";
import { loginSchema, refreshTokenSchema, signupSchema } from "../dto/auth.dto.js";
import * as authController from "../controllers/auth.controller.js";
import { normalizeAuthBody } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/signup", normalizeAuthBody, validateBody(signupSchema), asyncHandler(authController.signup));
router.post("/login", normalizeAuthBody, validateBody(loginSchema), asyncHandler(authController.login));
router.post("/refresh-token", validateBody(refreshTokenSchema), asyncHandler(authController.refreshToken));
router.post("/logout", asyncHandler(authController.logout));

export default router;
