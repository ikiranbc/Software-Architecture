/**
 * Route Layer (Router + Middleware Composition pattern):
 * - Maps transport paths to controllers.
 * - Composes middleware pipeline explicitly per endpoint.
 */

import { Router } from "express";
import { asyncHandler, requireUser, validateBody } from "@hotel-booking/shared-utils";
import * as walletController from "../controllers/wallet.controller.js";
import { proceedPaymentSchema, topUpSchema } from "../dto/wallet.dto.js";
import { normalizeWalletBody } from "../middlewares/wallet.middleware.js";

const router = Router();

router.post("/api/wallet/top-up", requireUser, normalizeWalletBody, validateBody(topUpSchema), asyncHandler(walletController.topUp));
router.get("/api/wallet/balance", requireUser, asyncHandler(walletController.getBalance));
router.get("/api/wallet/transactions", requireUser, asyncHandler(walletController.getTransactions));
router.post("/api/payments/:bookingId/proceed", requireUser, validateBody(proceedPaymentSchema), asyncHandler(walletController.proceedPayment));

export default router;
