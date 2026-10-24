import { Router } from "express";
import { UserRole } from "@prisma/client";
import {
  joinQueueController,
  getQueueStatusController,
  getMyActiveTokensController,
  declareSmartHoldController,
  cancelSmartHoldController,
  callNextController,
  pauseQueueController,
  resumeQueueController,
  closeQueueController,
  getCurrentServingController,
  getQueueStatsController,
  getQueueEventsController,
  getAvailableServicesController,
  updateQueueConfigController,
  getStaffAnalyticsController,
} from "../controllers/queue.controller.js";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";
import { validateParams } from "../middleware/validateParams.middleware.js";
import { validateRequest } from "../middleware/validate.middleware.js";
import {
  queueIdParamSchema,
  declareHoldSchema,
  updateQueueConfigSchema,
} from "../validators/queue.validator.js";

const router = Router();

// Public / Discovery
router.get("/services", getAvailableServicesController);

// Student Endpoints
router.get("/queue/my-active", authenticate, authorizeRoles(UserRole.STUDENT), getMyActiveTokensController);
router.post(
  "/queue/:queueId/join",
  authenticate,
  authorizeRoles(UserRole.STUDENT),
  validateParams(queueIdParamSchema),
  joinQueueController
);
router.post(
  "/queue/:queueId/hold",
  authenticate,
  authorizeRoles(UserRole.STUDENT),
  validateParams(queueIdParamSchema),
  validateRequest(declareHoldSchema),
  declareSmartHoldController
);
router.post(
  "/queue/:queueId/hold/cancel",
  authenticate,
  authorizeRoles(UserRole.STUDENT),
  validateParams(queueIdParamSchema),
  cancelSmartHoldController
);

// Shared Status Endpoints
router.get(
  "/queue/:queueId/status",
  authenticate,
  validateParams(queueIdParamSchema),
  getQueueStatusController
);
router.get(
  "/queue/:queueId/current-serving",
  authenticate,
  validateParams(queueIdParamSchema),
  getCurrentServingController
);

// Staff Queue Operations
router.post(
  "/queue/:queueId/call-next",
  authenticate,
  authorizeRoles(UserRole.STAFF),
  validateParams(queueIdParamSchema),
  callNextController
);
router.post(
  "/queue/:queueId/pause",
  authenticate,
  authorizeRoles(UserRole.STAFF),
  validateParams(queueIdParamSchema),
  pauseQueueController
);
router.post(
  "/queue/:queueId/resume",
  authenticate,
  authorizeRoles(UserRole.STAFF),
  validateParams(queueIdParamSchema),
  resumeQueueController
);
router.post(
  "/queue/:queueId/close",
  authenticate,
  authorizeRoles(UserRole.STAFF),
  validateParams(queueIdParamSchema),
  closeQueueController
);
router.patch(
  "/queue/:queueId/config",
  authenticate,
  authorizeRoles(UserRole.STAFF),
  validateParams(queueIdParamSchema),
  validateRequest(updateQueueConfigSchema),
  updateQueueConfigController
);
router.get(
  "/queue/:queueId/stats",
  authenticate,
  authorizeRoles(UserRole.STAFF),
  validateParams(queueIdParamSchema),
  getQueueStatsController
);
router.get(
  "/queue/:queueId/events",
  authenticate,
  authorizeRoles(UserRole.STAFF),
  validateParams(queueIdParamSchema),
  getQueueEventsController
);
router.get(
  "/queue/:queueId/analytics",
  authenticate,
  authorizeRoles(UserRole.STAFF),
  validateParams(queueIdParamSchema),
  getStaffAnalyticsController
);

export default router;
