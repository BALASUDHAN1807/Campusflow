import { Router } from "express";
import {
  registerController,
  loginController,
  logoutController,
  getCurrentUserController,
} from "../controllers/auth.controller.js";
import { validateRequest } from "../middleware/validate.middleware.js";
import { registerSchema, loginSchema } from "../validators/auth.validator.js";
import { authenticate } from "../middleware/auth.middleware.js";

const authRouter = Router();

authRouter.post("/register", validateRequest(registerSchema), registerController);
authRouter.post("/login", validateRequest(loginSchema), loginController);
authRouter.post("/logout", logoutController);
authRouter.get("/me", authenticate, getCurrentUserController);

export default authRouter;
