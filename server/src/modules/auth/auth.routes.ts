import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authLimiter } from "../../middleware/rate-limit.js";
import { validateBody } from "../../middleware/validate.js";
import { authController } from "./auth.controller.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth.schemas.js";

export const authRouter = Router();

authRouter.post("/register", authLimiter, validateBody(registerSchema), authController.register);
authRouter.post("/login", authLimiter, validateBody(loginSchema), authController.login);
authRouter.post("/logout", authController.logout);
authRouter.post("/password/forgot", authLimiter, validateBody(forgotPasswordSchema), authController.forgot);
authRouter.post("/password/reset", authLimiter, validateBody(resetPasswordSchema), authController.reset);

authRouter.get("/me", authenticate, authController.me);
authRouter.patch("/password", authenticate, validateBody(changePasswordSchema), authController.changePassword);
