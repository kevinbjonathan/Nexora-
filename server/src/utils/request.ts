import type { Request } from "express";
import type { SessionMeta } from "../modules/auth/session.service.js";

export function sessionMeta(req: Request): SessionMeta {
  return {
    userAgent: req.get("user-agent") ?? undefined,
    ipAddress: req.ip ?? undefined,
  };
}

export function sessionCookie(req: Request, cookieName: string): string | undefined {
  return req.cookies?.[cookieName] as string | undefined;
}
