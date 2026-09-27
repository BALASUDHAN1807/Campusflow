import { Router } from "express";
import {
  getNotificationsController,
  getUnreadCountController,
  markNotificationReadController,
  markAllNotificationsReadController,
} from "../controllers/notification.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validateParams } from "../middleware/validateParams.middleware.js";
import { notificationIdParamSchema } from "../validators/notification.validator.js";

const router = Router();

router.get("/notifications", authenticate, getNotificationsController);
router.get("/notifications/unread-count", authenticate, getUnreadCountController);
router.patch("/notifications/read-all", authenticate, markAllNotificationsReadController);
router.patch(
  "/notifications/:notificationId/read",
  authenticate,
  validateParams(notificationIdParamSchema),
  markNotificationReadController
);

export default router;
