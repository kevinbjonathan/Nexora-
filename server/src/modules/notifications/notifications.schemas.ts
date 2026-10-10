import { z } from "zod";
import { paginationSchema } from "../../utils/pagination.js";
import { uuidSchema } from "../users/users.schemas.js";

export const listNotificationsSchema = paginationSchema.extend({
  unreadOnly: z.coerce.boolean().optional().default(false),
});

export const notificationIdParamsSchema = z.object({ notificationId: uuidSchema });

export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>;
export type NotificationIdParams = z.infer<typeof notificationIdParamsSchema>;