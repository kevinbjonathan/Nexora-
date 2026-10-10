import { Server, type Socket } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { corsOrigins, env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../utils/logger.js";
import { resolveSession } from "../modules/auth/session.service.js";
import { setIo, projectRoom, userRoom, workspaceRoom } from "./emitter.js";

let io: Server | null = null;

function readSessionCookie(socket: Socket): string | null {
  const cookieHeader = socket.handshake.headers.cookie;
  if (!cookieHeader) return null;
  const prefix = `${env.COOKIE_NAME}=`;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      try {
        return decodeURIComponent(trimmed.slice(prefix.length));
      } catch {
        return trimmed.slice(prefix.length);
      }
    }
  }
  return null;
}

export function attachSocketIo(httpServer: HttpServer): void {
  io = new Server(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
  });

  io.use(async (socket, next) => {
    const token = readSessionCookie(socket);
    if (!token) {
      next(new Error("UNAUTHENTICATED"));
      return;
    }

    try {
      const session = await resolveSession(token);
      if (!session) {
        next(new Error("UNAUTHENTICATED"));
        return;
      }
      if (session.user.status === "SUSPENDED" || session.user.status === "INACTIVE") {
        next(new Error("FORBIDDEN"));
        return;
      }
      socket.data.userId = session.user.id;
      next();
    } catch (error) {
      logger.error({ errMessage: error instanceof Error ? error.message : "unknown" }, "Socket auth failed");
      next(new Error("UNAUTHENTICATED"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as string;
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    await socket.join(userRoom(userId));

    try {
      const [memberships, projectMembers] = await Promise.all([
        prisma.workspaceMembership.findMany({
          where: { userId },
          select: { workspaceId: true },
        }),
        prisma.projectMember.findMany({
          where: { userId },
          select: { projectId: true },
        }),
      ]);

      for (const membership of memberships) {
        await socket.join(workspaceRoom(membership.workspaceId));
      }
      for (const membership of projectMembers) {
        await socket.join(projectRoom(membership.projectId));
      }
    } catch (error) {
      logger.error({ errMessage: error instanceof Error ? error.message : "unknown" }, "Socket room join failed");
    }

    logger.info({ userId }, "Socket connected");
  });

  setIo(io);
}

export function closeSocketIo(): Promise<void> {
  return new Promise((resolvePromise) => {
    if (!io) {
      resolvePromise();
      return;
    }
    io.close(() =>
      setImmediate(() => {
        io = null;
        resolvePromise();
      }),
    );
  });
}