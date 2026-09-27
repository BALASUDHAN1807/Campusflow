import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service.js";
import { sendSuccess } from "../utils/response.js";

const COOKIE_NAME = "campusflow_token";

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  maxAge: 24 * 60 * 60 * 1000, // 1 day
  path: "/",
});

export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { user, token } = await AuthService.register(req.body);

    // Set secure HTTP-only cookie
    res.cookie(COOKIE_NAME, token, getCookieOptions());

    sendSuccess(
      res,
      { user, token },
      "Registration successful",
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { user, token } = await AuthService.login(req.body);

    // Set secure HTTP-only cookie
    res.cookie(COOKIE_NAME, token, getCookieOptions());

    sendSuccess(
      res,
      { user, token },
      "Login successful",
      200
    );
  } catch (error) {
    next(error);
  }
}

export function logoutController(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Clear the authentication cookie
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
      path: "/",
    });

    sendSuccess(res, null, "Logged out successfully", 200);
  } catch (error) {
    next(error);
  }
}

export function getCurrentUserController(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    sendSuccess(res, req.user, undefined, 200);
  } catch (error) {
    next(error);
  }
}
