import { createServer, type Server as HttpServer } from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { logger } from "./utils/logger.js";
import { attachSocketIo, closeSocketIo } from "./realtime/socket.js";

export async function startServer(): Promise<HttpServer> {
  const app = createApp();
  const httpServer = createServer(app);

  attachSocketIo(httpServer);

  httpServer.listen(env.PORT, () => {
    logger.info(`Nexora API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}. Shutting down gracefully...`);

    const forceTimer = setTimeout(() => {
      logger.error("Graceful shutdown timed out; forcing exit.");
      process.exit(1);
    }, 10_000);
    forceTimer.unref();

    httpServer.close();
    await closeSocketIo();
    await prisma.$disconnect();
    clearTimeout(forceTimer);
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  return httpServer;
}