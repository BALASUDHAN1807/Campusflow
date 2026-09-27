import { Router } from "express";
import { UserRole } from "@prisma/client";
import {
  getTokenDetailsController,
  cancelTokenController,
  completeTokenController,
  markNoShowController,
} from "../controllers/queue.controller.js";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";
import { validateParams } from "../middleware/validateParams.middleware.js";
import { tokenIdParamSchema } from "../validators/queue.validator.js";

const router = Router();

// Token Details (Student own or Staff)
router.get("/token/:tokenId", authenticate, validateParams(tokenIdParamSchema), getTokenDetailsController);

// Student Token Cancellation
router.post(
  "/token/:tokenId/cancel",
  authenticate,
  authorizeRoles(UserRole.STUDENT),
  validateParams(tokenIdParamSchema),
  cancelTokenController
);

// Staff Consultation Lifecycle
router.post(
  "/token/:tokenId/complete",
  authenticate,
  authorizeRoles(UserRole.STAFF),
  validateParams(tokenIdParamSchema),
  completeTokenController
);
router.post(
  "/token/:tokenId/no-show",
  authenticate,
  authorizeRoles(UserRole.STAFF),
  validateParams(tokenIdParamSchema),
  markNoShowController
);

export default router;
