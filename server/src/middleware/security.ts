import express, { type Express, type RequestHandler } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { corsOrigins, env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";

// Blocks cross-site state-changing requests that carry a session cookie.
// Browsers always attach an Origin header to such requests, so a missing or
// non-allowlisted Origin means the request did not originate from our frontend.
export const csrfOriginGuard: RequestHandler = (req, _res, next) => {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    next();
    return;
  }

  const hasSessionCookie = Boolean(req.cookies?.[env.COOKIE_NAME]);
  const origin = req.get("origin");

  if (!hasSessionCookie && !origin) {
    next();
    return;
  }

  if (origin && corsOrigins.includes(origin)) {
    next();
    return;
  }

  next(ApiError.forbidden("Cross-site request blocked."));
};

export function applySecurity(app: Express): void {
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));
  app.use(csrfOriginGuard);
}
