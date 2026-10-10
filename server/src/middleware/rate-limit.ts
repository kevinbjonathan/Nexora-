import { rateLimit } from "express-rate-limit";

const rateLimitBody = (message: string) => ({ error: { code: "RATE_LIMITED", message } });

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: rateLimitBody("Too many requests. Please try again later."),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: rateLimitBody("Too many authentication attempts. Please try again later."),
});
