import type { Request, Response } from "express";
import { params, query } from "../../middleware/validate.js";
import {
  deleteNotification,
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notifications.service.js";
import type {
  ListNotificationsInput,
  NotificationIdParams,
} from "./notifications.schemas.js";

export const notificationsController = {
  async list(req: Request, res: Response) {
    const input = query<ListNotificationsInput>(req);
    const result = await listNotifications(
      req.auth!.user.id,
      input.page,
      input.pageSize,
      input.unreadOnly,
    );
    res.json(result);
  },

  async unreadCount(req: Request, res: Response) {
    const result = await getUnreadCount(req.auth!.user.id);
    res.json(result);
  },

  async markRead(req: Request, res: Response) {
    const { notificationId } = params<NotificationIdParams>(req);
    const notification = await markNotificationRead(req.auth!.user.id, notificationId);
    res.json({ notification });
  },

  async markAllRead(req: Request, res: Response) {
    const result = await markAllNotificationsRead(req.auth!.user.id);
    res.json(result);
  },

  async remove(req: Request, res: Response) {
    const { notificationId } = params<NotificationIdParams>(req);
    await deleteNotification(req.auth!.user.id, notificationId);
    res.status(204).send();
  },
};