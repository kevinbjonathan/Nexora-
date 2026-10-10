import type { ActivityEntityType, Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { queueAfterCommit } from "../../lib/events.js";
import { emitToWorkspace } from "../../realtime/emitter.js";
import { buildPaginatedResult, toSkipTake } from "../../utils/pagination.js";
import { assertWorkspacePermission } from "../access/access.service.js";
import type { PrismaTransactionClient } from "../../lib/transaction.js";

export interface RecordActivityInput {
  workspaceId: string;
  entityType: ActivityEntityType;
  entityId: string;
  action: string;
  actorId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  summary?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export async function recordActivity(input: RecordActivityInput, tx?: PrismaTransactionClient) {
  const client = tx ?? prisma;
  const activity = await client.activityLog.create({
    data: {
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary ?? null,
      metadata: input.metadata,
    },
  });

  // Only broadcast once the surrounding transaction has committed.
  queueAfterCommit(() => emitToWorkspace(input.workspaceId, "activity:created", activity));

  return activity;
}

export async function listActivity(
  userId: string,
  workspaceId: string,
  page: number,
  pageSize: number,
  filters: { projectId?: string; taskId?: string; action?: string },
) {
  await assertWorkspacePermission(userId, workspaceId, "activity:view");

  const where: Prisma.ActivityLogWhereInput = {
    workspaceId,
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.taskId ? { taskId: filters.taskId } : {}),
    ...(filters.action ? { action: filters.action } : {}),
  };

  const { skip, take } = toSkipTake(page, pageSize);
  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: {
        actor: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.activityLog.count({ where }),
  ]);

  return buildPaginatedResult(items, total, page, pageSize);
}