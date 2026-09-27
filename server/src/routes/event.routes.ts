import { Router } from "express";
import {
  getEventsController,
  getEventDetailsController,
} from "../controllers/event.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validateParams } from "../middleware/validateParams.middleware.js";
import { eventIdParamSchema } from "../validators/event.validator.js";

const router = Router();

// List events with server-side filters & pagination (Scoped by role: Staff sees full, Student sees own)
router.get("/events", authenticate, getEventsController);
router.get("/queue/:queueId/events", authenticate, getEventsController);

// Event Details (Drawer / Modal inspection)
router.get(
  "/events/:eventId",
  authenticate,
  validateParams(eventIdParamSchema),
  getEventDetailsController
);

export default router;
