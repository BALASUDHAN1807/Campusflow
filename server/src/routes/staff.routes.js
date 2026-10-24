import { Router } from "express";
import { UserRole } from "@prisma/client";
import {
  getStaffQueuesController,
  getStaffQueueDetailsController,
  getStaffAnalyticsController,
} from "../controllers/queue.controller.js";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";
import { validateParams } from "../middleware/validateParams.middleware.js";
import { queueIdParamSchema } from "../validators/queue.validator.js";

const router = Router();

// Staff Dashboard & Overview
router.get("/staff/queues", authenticate, authorizeRoles(UserRole.STAFF), getStaffQueuesController);
router.get(
  "/staff/queue/:queueId",
  authenticate,
  authorizeRoles(UserRole.STAFF),
  validateParams(queueIdParamSchema),
  getStaffQueueDetailsController
);
router.get("/staff/analytics", authenticate, authorizeRoles(UserRole.STAFF), getStaffAnalyticsController);

export default router;
