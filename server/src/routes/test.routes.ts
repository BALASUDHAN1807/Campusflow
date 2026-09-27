import { Router, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";
import { sendSuccess } from "../utils/response.js";

const testRouter = Router();

// Student test route: requires authentication and STUDENT role
testRouter.get(
  "/student/test",
  authenticate,
  authorizeRoles(UserRole.STUDENT),
  (_req: Request, res: Response) => {
    sendSuccess(res, null, "Student access verified.");
  }
);

// Staff test route: requires authentication and STAFF role
testRouter.get(
  "/staff/test",
  authenticate,
  authorizeRoles(UserRole.STAFF),
  (_req: Request, res: Response) => {
    sendSuccess(res, null, "Staff access verified.");
  }
);

export default testRouter;
