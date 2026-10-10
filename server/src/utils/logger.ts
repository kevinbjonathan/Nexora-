import { pino } from "pino";
import { env } from "../config/env.js";

// Structured logger with redaction of secrets and credential-bearing fields.
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'res.headers["set-cookie"]',
      "password",
      "passwordHash",
      "password_hash",
      "currentPassword",
      "newPassword",
      "token",
      "tokenHash",
      "token_hash",
      "secret",
      "SESSION_SECRET",
      "DATABASE_URL",
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.secret",
    ],
    remove: true,
  },
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});
