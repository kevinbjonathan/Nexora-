import type { RequestHandler } from "express";
import { ZodError, type ZodType } from "zod";
import { ApiError } from "../utils/api-error.js";

function formatIssues(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(ApiError.validation("The request contains invalid data.", formatIssues(result.error)));
      return;
    }
    req.validated = { ...req.validated, body: result.data };
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(ApiError.validation("The query parameters are invalid.", formatIssues(result.error)));
      return;
    }
    req.validated = { ...req.validated, query: result.data };
    next();
  };
}

export function validateParams<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      next(ApiError.validation("The path parameters are invalid.", formatIssues(result.error)));
      return;
    }
    req.validated = { ...req.validated, params: result.data };
    next();
  };
}

export function body<T>(req: { validated?: { body?: unknown } }): T {
  return req.validated?.body as T;
}

export function query<T>(req: { validated?: { query?: unknown } }): T {
  return req.validated?.query as T;
}

export function params<T>(req: { validated?: { params?: unknown } }): T {
  return req.validated?.params as T;
}
