import type {
  ActivityEntityType,
  Notification,
  NotificationType,
} from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";
import { buildPaginatedResult, toSkipTake } from "../../utils/pagination.js";
import { queueAfterCommit } from "../../lib/events.js";
import { emitToUser } from "../../realtime/emitter.js";
import type { PrismaTransactionClient } from "../../lib/transaction.js";

export interface CreateNotificationInput {
  recipientId: string;
  workspaceId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  targetType?: ActivityEntityType | null;
  targetId?: string | null;
  dedupeKey?: string | null;
}

export async function createNotification(
  input: CreateNotificationInput,
  tx?: PrismaTransactionClient,
) {
  const client = tx ?? prisma;

  const data = {
    recipientId: input.recipientId,
    workspaceId: input.workspaceId,
    actorId: input.actorId ?? null,
    type: input.type,
    title: input.title,
    body: input.body,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    dedupeKey: input.dedupeKey ?? null,
  };

  const notification =
    input.dedupeKey != null
      ? await client.notification.upsert({
          where: {
            recipientId_dedupeKey: {
              recipientId: input.recipientId,
              dedupeKey: input.dedupeKey,
            },
          },
          create: data,
          update: {
            title: input.title,
            body: input.body,
            actorId: input.actorId ?? null,
            readAt: null,
            createdAt: new Date(),
          },
        })
      : await client.notification.create({ data });

  queueAfterCommit(() => emitToUser(input.recipientId, "notification:new", notification));

  return notification;
}

export function serializeNotification(notification: Notification) {
  return {
    id: notification.id,
    recipientId: notification.recipientId,
    workspaceId: notification.workspaceId,
    actorId: notification.actorId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    targetType: notification.targetType,
    targetId: notification.targetId,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };
}

export async function listNotifications(
  userId: string,
  page: number,
  pageSize: number,
  unreadOnly = false,
) {
  const where = {
    recipientId: userId,
    ...(unreadOnly ? { readAt: null } : {}),
  } as const;

  const { skip, take } = toSkipTake(page, pageSize);
  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      include: {
        actor: { select: { id: true, name: true, avatarUrl: true } },
        workspace: { select: { id: true, name: true } },
      },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.count({ where }),
  ]);

  const mapped = items.map((notification) => ({
    ...serializeNotification(notification),
    actor: notification.actor,
    workspace: notification.workspace,
  }));

  return buildPaginatedResult(mapped, total, page, pageSize);
}

export async function getUnreadCount(userId: string) {
  const count = await prisma.notification.count({
    where: { recipientId: userId, readAt: null },
  });
  return { count };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.recipientId !== userId) {
    throw ApiError.notFound("Notification not found.");
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
  return serializeNotification(updated);
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { recipientId: userId, readAt: null },
    data: { readAt: new Date() },
  });
  return getUnreadCount(userId);
}

export async function deleteNotification(userId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.recipientId !== userId) {
    throw ApiError.notFound("Notification not found.");
  }
  await prisma.notification.delete({ where: { id: notificationId } });
}