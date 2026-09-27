import { Router } from "express";
import healthRoutes from "./health.routes.js";
import authRoutes from "./auth.routes.js";
import testRoutes from "./test.routes.js";
import queueRoutes from "./queue.routes.js";
import tokenRoutes from "./token.routes.js";
import staffRoutes from "./staff.routes.js";
import notificationRoutes from "./notification.routes.js";
import eventRoutes from "./event.routes.js";

const apiRouter = Router();

// Health Check
apiRouter.use("/", healthRoutes);

// Authentication & Identity
apiRouter.use("/auth", authRoutes);

// Queue & Service Operations
apiRouter.use("/", queueRoutes);

// Token Lifecycle Operations
apiRouter.use("/", tokenRoutes);

// Notifications
apiRouter.use("/", notificationRoutes);

// Event Log & Audit
apiRouter.use("/", eventRoutes);

// Staff Management
apiRouter.use("/", staffRoutes);

// Test Verification Routes
apiRouter.use("/", testRoutes);

export default apiRouter;

