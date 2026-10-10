import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";
import { logger } from "../utils/logger.js";

export const getHealth: RequestHandler = (_req, res) => {
  res.json({
    status: "ok",
    service: "nexora-api",
    tagline: "The Live Project Command Center",
    timestamp: new Date().toISOString(),
  });
};

export const getDatabaseHealth: RequestHandler = async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      database: "reachable",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Do not expose connection strings, SQL, or stack traces to the client.
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ errMessage: message }, "[health/db] Database check failed");
    res.status(503).json({
      status: "error",
      database: "unreachable",
      message: "Database is not reachable",
    });
  }
};
