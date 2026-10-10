import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";
import { resolveSession, touchSession } from "../modules/auth/session.service.js";

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const token = req.cookies?.[env.COOKIE_NAME];
    if (!token) {
      throw ApiError.unauthenticated();
    }

    const session = await resolveSession(token);
    if (!session) {
      throw ApiError.unauthenticated("Your session has expired. Please sign in again.");
    }

    if (session.user.status === "SUSPENDED" || session.user.status === "INACTIVE") {
      throw ApiError.forbidden("Your account is not active.");
    }

    req.auth = {
      sessionId: session.id,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        status: session.user.status,
      },
    };

    void touchSession(session.id);
    next();
  } catch (error) {
    next(error);
  }
};
