import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/api-error.js";
import { logger } from "../utils/logger.js";
import { isProduction } from "../config/env.js";

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

function send(res: Parameters<RequestHandler>[1], status: number, body: ErrorBody) {
  res.status(status).json(body);
}

export const notFoundHandler: RequestHandler = (req, res) => {
  send(res, 404, {
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
};

// Express 5 forwards rejected async handlers here automatically.
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (res.headersSent) {
    return;
  }

  if (err instanceof ApiError) {
    send(res, err.status, {
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof ZodError) {
    send(res, 400, {
      error: {
        code: "VALIDATION_ERROR",
        message: "The request contains invalid data.",
        details: err.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  // Body-parser JSON parse failures.
  if (err && typeof err === "object" && (err as { type?: string }).type === "entity.parse.failed") {
    send(res, 400, {
      error: { code: "BAD_REQUEST", message: "Malformed JSON body." },
    });
    return;
  }

  // Prisma known request errors (no raw error surfaced to the client).
  const prismaCode = (err as { code?: string })?.code;
  if (prismaCode === "P2002") {
    send(res, 409, {
      error: { code: "CONFLICT", message: "A resource with these values already exists." },
    });
    return;
  }
  if (prismaCode === "P2025") {
    send(res, 404, {
      error: { code: "NOT_FOUND", message: "The requested resource was not found." },
    });
    return;
  }

  const requestId = (req as { id?: string }).id;
  logger.error(
    {
      requestId,
      errName: err instanceof Error ? err.name : "UnknownError",
      errMessage: err instanceof Error ? err.message : "Unknown error",
      stack: isProduction ? undefined : err instanceof Error ? err.stack : undefined,
    },
    "Unhandled error",
  );

  send(res, 500, {
    error: { code: "INTERNAL_ERROR", message: "Internal server error" },
  });
};
