import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";
import { buildPaginatedResult, toSkipTake } from "../../utils/pagination.js";
import { runInTransaction } from "../../lib/events.js";
import { recordActivity } from "../activity/activity.service.js";
import { createNotification } from "../notifications/notifications.service.js";
import { assertTaskAccess } from "../access/access.service.js";
import { roleHasPermission } from "../access/permissions.js";
import { emitToProject } from "../../realtime/emitter.js";
import type { CreateCommentInput, UpdateCommentInput } from "./comments.schemas.js";

export function serializeComment(comment: {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: comment.id,
    taskId: comment.taskId,
    authorId: comment.authorId,
    body: comment.body,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}

export async function createComment(userId: string, taskId: string, input: CreateCommentInput) {
  const access = await assertTaskAccess(userId, taskId, "comment:create");

  const comment = await runInTransaction(async (tx) => {
    const created = await tx.comment.create({
      data: { taskId, authorId: userId, body: input.body.trim() },
    });

    const task = await tx.task.findUniqueOrThrow({ where: { id: taskId } });

    await recordActivity(
      {
        workspaceId: access.workspaceId,
        projectId: task.projectId,
        taskId,
        entityType: "COMMENT",
        entityId: created.id,
        action: "comment_created",
        actorId: userId,
        summary: "Comment added",
      },
      tx,
    );

    if (task.assigneeId && task.assigneeId !== userId) {
      await createNotification(
        {
          recipientId: task.assigneeId,
          workspaceId: access.workspaceId,
          actorId: userId,
          type: "TASK_COMMENTED",
          title: "New comment on your task",
          body: input.body.trim().slice(0, 120),
          targetType: "TASK",
          targetId: taskId,
          dedupeKey: `task_commented:${taskId}:${userId}:${created.id}`,
        },
        tx,
      );
    }

    return created;
  });

  emitToProject(access.projectId, "comment:created", {
    taskId,
    comment: serializeComment(comment),
  });
  return serializeComment(comment);
}

export async function listComments(userId: string, taskId: string, page: number, pageSize: number) {
  await assertTaskAccess(userId, taskId, "task:view");

  const where = { taskId, deletedAt: null };
  const { skip, take } = toSkipTake(page, pageSize);

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      skip,
      take,
      orderBy: { createdAt: "asc" },
    }),
    prisma.comment.count({ where }),
  ]);

  const items = comments.map((comment) => ({
    ...serializeComment(comment),
    author: comment.author,
  }));
  return buildPaginatedResult(items, total, page, pageSize);
}

export async function updateComment(
  userId: string,
  taskId: string,
  commentId: string,
  input: UpdateCommentInput,
) {
  const access = await assertTaskAccess(userId, taskId, "task:view");

  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.taskId !== taskId || comment.deletedAt) {
    throw ApiError.notFound("Comment not found.");
  }

  const canEdit =
    comment.authorId === userId || roleHasPermission(access.membership.role, "comment:update_any");
  if (!canEdit) {
    throw ApiError.forbidden();
  }

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { body: input.body.trim() },
  });

  await recordActivity({
    workspaceId: access.workspaceId,
    projectId: access.projectId,
    taskId,
    entityType: "COMMENT",
    entityId: commentId,
    action: "comment_updated",
    actorId: userId,
    summary: "Comment updated",
  });
  emitToProject(access.projectId, "comment:updated", { taskId, comment: serializeComment(updated) });

  return serializeComment(updated);
}

export async function deleteComment(userId: string, taskId: string, commentId: string) {
  const access = await assertTaskAccess(userId, taskId, "task:view");

  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.taskId !== taskId || comment.deletedAt) {
    throw ApiError.notFound("Comment not found.");
  }

  const canDelete =
    comment.authorId === userId || roleHasPermission(access.membership.role, "comment:delete_any");
  if (!canDelete) {
    throw ApiError.forbidden();
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: { deletedAt: new Date() },
  });

  await recordActivity({
    workspaceId: access.workspaceId,
    projectId: access.projectId,
    taskId,
    entityType: "COMMENT",
    entityId: commentId,
    action: "comment_deleted",
    actorId: userId,
    summary: "Comment deleted",
  });
  emitToProject(access.projectId, "comment:deleted", { taskId, commentId });
}