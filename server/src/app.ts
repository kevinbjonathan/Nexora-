import express, { type Express } from "express";
import { applySecurity } from "./middleware/security.js";
import { requestLogger } from "./middleware/request-logger.js";
import { generalLimiter } from "./middleware/rate-limit.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { isProduction } from "./config/env.js";
import { healthRouter } from "./routes/health.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { workspacesRouter } from "./modules/workspaces/workspaces.routes.js";
import { projectsRouter } from "./modules/projects/projects.routes.js";
import { tasksRouter } from "./modules/tasks/tasks.routes.js";
import { commentsRouter } from "./modules/comments/comments.routes.js";
import { activityRouter } from "./modules/activity/activity.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { docsRouter } from "./docs/openapi.js";

export function createApp(): Express {
  const app = express();
  app.disable("x-powered-by");

  applySecurity(app);
  app.use(requestLogger);
  app.use(generalLimiter);

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/workspaces", workspacesRouter);
  app.use("/api/workspaces/:workspaceId/projects", projectsRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/projects/:projectId/tasks", tasksRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/tasks/:taskId/comments", commentsRouter);
  app.use("/api/workspaces/:workspaceId/activity", activityRouter);
  app.use("/api/workspaces/:workspaceId/dashboard", dashboardRouter);
  app.use("/api/notifications", notificationsRouter);

  if (!isProduction) {
    app.use("/api/docs", docsRouter);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}