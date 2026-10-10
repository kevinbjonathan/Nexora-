import type { ActivityEntityType, ActivityLog, Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { queueAfterCommit } from "../../lib/events.js";
import { emitToWorkspace } from "../../realtime/emitter.js";
import { buildPaginatedResult, toSkipTake } from "../../utils/pagination.js";
import { assertWorkspacePermission } from "../access/access.service.js";
import type { PrismaTransactionClient } from "../../lib/transaction.js";

// Only non-sensitive identity fields are ever exposed on an activity record.
export interface ActivityActor {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface ActivityRelations {
  actor: ActivityActor | null;
  project: { id: string; name: string } | null;
  task: { id: string; title: string } | null;
}

/**
 * Single source of truth for the Change Radar wire format. Keeps the actor
 * identity (id/name/avatarUrl) in one place so both the REST endpoints and the
 * realtime broadcast expose it identically, and never leak sensitive user
 * fields (password hash, email, sessions, ...).
 */
export function serializeActivity(activity: ActivityLog, relations: ActivityRelations) {
  return {
    id: activity.id,
    workspaceId: activity.workspaceId,
    projectId: activity.projectId,
    taskId: activity.taskId,
    actorId: activity.actorId,
    action: activity.action,
    entityType: activity.entityType,
    entityId: activity.entityId,
    summary: activity.summary,
    metadata: activity.metadata,
    createdAt: activity.createdAt,
    actor: relations.actor,
    project: relations.project,
    task: relations.task,
  };
}

/** Resolves the identity relations for one activity row (best-effort). */
async function loadActivityRelations(
  client: PrismaTransactionClient,
  ids: { actorId?: string | null; projectId?: string | null; taskId?: string | null },
): Promise<ActivityRelations> {
  const [actor, project, task] = await Promise.all([
    ids.actorId
      ? client.user.findUnique({
          where: { id: ids.actorId },
          select: { id: true, name: true, avatarUrl: true },
        })
      : Promise.resolve(null),
    ids.projectId
      ? client.project.findUnique({
          where: { id: ids.projectId },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
    ids.taskId
      ? client.task.findUnique({
          where: { id: ids.taskId },
          select: { id: true, title: true },
        })
      : Promise.resolve(null),
  ]);
  return { actor, project, task };
}

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

  // Resolve the actor (and subject) identity so the broadcast carries the same
  // shape as the REST endpoints — otherwise the client renders "Unknown user"
  // for every live event.
  const relations = await loadActivityRelations(client, {
    actorId: input.actorId,
    projectId: input.projectId,
    taskId: input.taskId,
  });
  const payload = serializeActivity(activity, relations);

  // Only broadcast once the surrounding transaction has committed.
  queueAfterCommit(() => emitToWorkspace(input.workspaceId, "activity:created", payload));

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

  const mapped = items.map((item) =>
    serializeActivity(item, { actor: item.actor, project: item.project, task: item.task }),
  );

  return buildPaginatedResult(mapped, total, page, pageSize);
}