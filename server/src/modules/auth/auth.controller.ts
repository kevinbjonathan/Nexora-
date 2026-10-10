import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { body } from "../../middleware/validate.js";
import { sessionMeta } from "../../utils/request.js";
import {
  changePassword,
  forgotPassword,
  getCurrentUser,
  login,
  logout,
  register,
  resetPassword,
} from "./auth.service.js";
import { clearSessionCookie, setSessionCookie } from "./session.service.js";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "./auth.schemas.js";

export const authController = {
  async register(req: Request, res: Response) {
    const { user, token } = await register(body<RegisterInput>(req), sessionMeta(req));
    setSessionCookie(res, token);
    res.status(201).json({ user });
  },

  async login(req: Request, res: Response) {
    const { user, token } = await login(body<LoginInput>(req), sessionMeta(req));
    setSessionCookie(res, token);
    res.json({ user });
  },

  async logout(req: Request, res: Response) {
    await logout(req.cookies?.[env.COOKIE_NAME]);
    clearSessionCookie(res);
    res.status(204).send();
  },

  async me(req: Request, res: Response) {
    const user = await getCurrentUser(req.auth!.user.id);
    res.json({ user });
  },

  async forgot(req: Request, res: Response) {
    const result = await forgotPassword(body<ForgotPasswordInput>(req).email);
    res.json(result);
  },

  async reset(req: Request, res: Response) {
    await resetPassword(body<ResetPasswordInput>(req));
    res.status(204).send();
  },

  async changePassword(req: Request, res: Response) {
    await changePassword(req.auth!.user.id, req.auth!.sessionId, body<ChangePasswordInput>(req));
    res.status(204).send();
  },
};
