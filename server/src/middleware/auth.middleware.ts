import { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import { AuthService, SafeUser } from "../services/auth.service.js";
import { sendError } from "../utils/response.js";

// Extend Express Request interface to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined;

    // 1. Try reading from HTTP-only cookie
    if (req.cookies && req.cookies.campusflow_token) {
      token = req.cookies.campusflow_token;
    }

    // 2. Fallback: Try reading from Authorization Bearer header
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }

    if (!token) {
      sendError(res, "Authentication required.", 401);
      return;
    }

    // Verify JWT
    const payload = AuthService.verifyToken(token);

    // Retrieve user from database to ensure account is still active and valid
    const user = await AuthService.getUserById(payload.userId);
    if (!user) {
      sendError(res, "User account no longer exists.", 401);
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    sendError(res, "Authentication required.", 401);
  }
}

export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, "Authentication required.", 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(res, "You do not have permission to access this resource.", 403);
      return;
    }

    next();
  };
}
