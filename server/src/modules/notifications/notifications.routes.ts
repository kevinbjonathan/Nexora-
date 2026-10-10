import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateParams, validateQuery } from "../../middleware/validate.js";
import { notificationsController } from "./notifications.controller.js";
import {
  listNotificationsSchema,
  notificationIdParamsSchema,
} from "./notifications.schemas.js";

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get("/", validateQuery(listNotificationsSchema), notificationsController.list);
notificationsRouter.get("/unread-count", notificationsController.unreadCount);
notificationsRouter.post("/read-all", notificationsController.markAllRead);
notificationsRouter.patch(
  "/:notificationId/read",
  validateParams(notificationIdParamsSchema),
  notificationsController.markRead,
);
notificationsRouter.delete(
  "/:notificationId",
  validateParams(notificationIdParamsSchema),
  notificationsController.remove,
);