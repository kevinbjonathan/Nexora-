import type { Prisma, Task, TaskStatus } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";
import { buildPaginatedResult, toSkipTake } from "../../utils/pagination.js";
import { runInTransaction } from "../../lib/events.js";
import { recordActivity } from "../activity/activity.service.js";
import { createNotification } from "../notifications/notifications.service.js";
import {
  assertProjectAccess,
  assertTaskAccess,
  getWorkspaceMembershipOrThrow,
} from "../access/access.service.js";
import { emitToProject, emitToWorkspace } from "../../realtime/emitter.js";
import type {
  CreateTaskInput,
  ReorderTasksInput,
  UpdateTaskInput,
} from "./tasks.schemas.js";

export function serializeTask(task: Task) {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId,
    reporterId: task.reporterId,
    dueDate: task.dueDate,
    position: task.position,
    version: task.version,
    completedAt: task.completedAt,
    archivedAt: task.archivedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

type JsonScalar = string | number | boolean | null;

interface TaskChange {
  from: JsonScalar;
  to: JsonScalar;
}

export async function createTask(userId: string, projectId: string, input: CreateTaskInput) {
  const access = await assertProjectAccess(userId, projectId, "task:create");

  const assigneeId: string | null = input.assigneeId ?? null;
  if (assigneeId) {
    await getWorkspaceMembershipOrThrow(assigneeId, access.workspaceId);
  }

  const task = await runInTransaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        projectId,
        title: input.title.trim(),
        description: input.description ?? null,
        status: (input.status as TaskStatus | undefined) ?? "TODO",
        priority: (input.priority as Task["priority"]) ?? "MEDIUM",
        assigneeId,
        reporterId: userId,
        dueDate: input.dueDate ?? null,
        position: input.position ?? 0,
        version: 1,
      },
    });

    await recordActivity(
      {
        workspaceId: access.workspaceId,
        projectId,
        taskId: created.id,
        entityType: "TASK",
        entityId: created.id,
        action: "task_created",
        actorId: userId,
        metadata: { status: created.status, priority: created.priority },
        summary: "Task created",
      },
      tx,
    );

    if (assigneeId && assigneeId !== userId) {
      await createNotification(
        {
          recipientId: assigneeId,
          workspaceId: access.workspaceId,
          actorId: userId,
          type: "TASK_ASSIGNED",
          title: "You have been assigned a task",
          body: created.title,
          targetType: "TASK",
          targetId: created.id,
          dedupeKey: `task_assigned:${created.id}:${assigneeId}`,
        },
        tx,
      );
    }

    return created;
  });

  emitToProject(projectId, "task:created", serializeTask(task));
  return serializeTask(task);
}

export async function listTasks(
  userId: string,
  projectId: string,
  page: number,
  pageSize: number,
  filters: {
    status?: string;
    priority?: string;
    assigneeId?: string;
    includeArchived?: boolean;
  },
) {
  await assertProjectAccess(userId, projectId, "task:view");

  const where: Prisma.TaskWhereInput = {
    projectId,
    ...(filters.status ? { status: filters.status as TaskStatus } : {}),
    ...(filters.priority ? { priority: filters.priority as Task["priority"] } : {}),
    ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
    ...(filters.includeArchived ? {} : { archivedAt: null }),
  };

  const { skip, take } = toSkipTake(page, pageSize);
  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        reporter: { select: { id: true, name: true, avatarUrl: true } },
      },
      skip,
      take,
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    }),
    prisma.task.count({ where }),
  ]);

  const items = tasks.map((task) => ({
    ...serializeTask(task),
    assignee: task.assignee,
    reporter: task.reporter,
  }));
  return buildPaginatedResult(items, total, page, pageSize);
}

export async function getTask(userId: string, taskId: string) {
  await assertTaskAccess(userId, taskId, "task:view");

  const task = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: {
      project: { select: { id: true, name: true, workspaceId: true } },
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      reporter: { select: { id: true, name: true, avatarUrl: true } },
      comments: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  });

  return {
    task: {
      ...serializeTask(task),
      project: task.project,
      assignee: task.assignee,
      reporter: task.reporter,
    },
    comments: task.comments,
  };
}

export async function updateTask(userId: string, taskId: string, input: UpdateTaskInput) {
  const access = await assertTaskAccess(userId, taskId, "task:update");

  const current = await prisma.task.findUnique({ where: { id: taskId } });
  if (!current) {
    throw ApiError.notFound("Task not found.");
  }
  if (current.archivedAt) {
    throw ApiError.conflict("This task is archived.");
  }
  if (current.version !== input.version) {
    throw ApiError.versionConflict(current.version);
  }

  if (input.assigneeId) {
    await getWorkspaceMembershipOrThrow(input.assigneeId, access.workspaceId);
  }

  const data = buildUpdateData(input, current);

  // Optimistic concurrency: the version filter makes the write atomic.
  const result = await prisma.task.updateMany({
    where: { id: taskId, version: input.version },
    data: { ...data, version: { increment: 1 } },
  });

  if (result.count === 0) {
    const fresh = await prisma.task.findUnique({ where: { id: taskId } });
    throw ApiError.versionConflict(fresh?.version ?? current.version);
  }

  const updated = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });

  const assigneeChanged =
    input.assigneeId !== undefined && input.assigneeId !== current.assigneeId;

  await runInTransaction(async (tx) => {
    await recordActivity(
      {
        workspaceId: access.workspaceId,
        projectId: current.projectId,
        taskId,
        entityType: "TASK",
        entityId: taskId,
        action: "task_updated",
        actorId: userId,
        metadata: {
          changes: buildChanges(input, current) as unknown as Prisma.InputJsonValue,
          version: updated.version,
        },
        summary: "Task updated",
      },
      tx,
    );

    if (assigneeChanged && updated.assigneeId && updated.assigneeId !== userId) {
      await createNotification(
        {
          recipientId: updated.assigneeId,
          workspaceId: access.workspaceId,
          actorId: userId,
          type: "TASK_REASSIGNED",
          title: "A task was reassigned to you",
          body: updated.title,
          targetType: "TASK",
          targetId: taskId,
          dedupeKey: `task_reassigned:${taskId}:${updated.assigneeId}`,
        },
        tx,
      );
    }
  });

  emitToProject(current.projectId, "task:updated", serializeTask(updated));
  emitToWorkspace(access.workspaceId, "task:updated", serializeTask(updated));

  return serializeTask(updated);
}

export async function archiveTask(userId: string, taskId: string) {
  const access = await assertTaskAccess(userId, taskId, "task:delete");
  const current = await prisma.task.findUnique({ where: { id: taskId } });
  if (!current || current.archivedAt) {
    throw ApiError.notFound("Task not found.");
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { archivedAt: new Date() },
  });

  await recordActivity({
    workspaceId: access.workspaceId,
    projectId: current.projectId,
    taskId,
    entityType: "TASK",
    entityId: taskId,
    action: "task_archived",
    actorId: userId,
    summary: "Task archived",
  });
  emitToProject(current.projectId, "task:archived", serializeTask(updated));

  return serializeTask(updated);
}

export async function reorderTasks(userId: string, projectId: string, input: ReorderTasksInput) {
  await assertProjectAccess(userId, projectId, "task:update");

  const orderedIds = new Set(input.orders.map((order) => order.id));

  for (const order of input.orders) {
    const current = await prisma.task.findUnique({
      where: { id: order.id },
      select: { id: true, projectId: true, version: true },
    });
    if (!current || current.projectId !== projectId) {
      throw ApiError.badRequest(`Task ${order.id} does not belong to this project.`);
    }
    if (current.version !== order.version) {
      throw ApiError.versionConflict(current.version);
    }
  }

  // Apply the reorder within a unique ordering of positions.
  for (const order of input.orders) {
    await prisma.task.updateMany({
      where: { id: order.id, version: order.version },
      data: { position: order.position, version: { increment: 1 } },
    });
  }

  const updated = await prisma.task.findMany({
    where: { id: { in: Array.from(orderedIds) }, archivedAt: null },
    orderBy: { position: "asc" },
  });

  emitToProject(projectId, "task:reordered", {
    projectId,
    taskIds: Array.from(orderedIds),
  });

  return { tasks: updated.map(serializeTask) };
}

function buildUpdateData(input: UpdateTaskInput, current: Task): Prisma.TaskUncheckedUpdateManyInput {
  const data: Prisma.TaskUncheckedUpdateManyInput = {};

  if (input.title !== undefined) {
    data.title = input.title.trim();
  }
  if (input.description !== undefined) {
    data.description = input.description;
  }
  if (input.priority !== undefined) {
    data.priority = input.priority;
  }
  if (input.assigneeId !== undefined) {
    data.assigneeId = input.assigneeId;
  }
  if (input.dueDate !== undefined) {
    data.dueDate = input.dueDate;
  }
  if (input.position !== undefined) {
    data.position = input.position;
  }
  if (input.status !== undefined && input.status !== current.status) {
    data.status = input.status;
    if (input.status === "DONE") {
      data.completedAt = new Date();
    } else if (current.status === "DONE") {
      data.completedAt = null;
    }
  }

  return data;
}

function buildChanges(input: UpdateTaskInput, current: Task): Record<string, TaskChange> {
  const changes: Record<string, TaskChange> = {};

  if (input.title !== undefined && input.title.trim() !== current.title) {
    changes.title = { from: current.title, to: input.title.trim() };
  }
  if (input.description !== undefined && input.description !== current.description) {
    changes.description = { from: current.description, to: input.description };
  }
  if (input.status !== undefined && input.status !== current.status) {
    changes.status = { from: current.status, to: input.status };
  }
  if (input.priority !== undefined && input.priority !== current.priority) {
    changes.priority = { from: current.priority, to: input.priority };
  }
  if (input.assigneeId !== undefined && input.assigneeId !== current.assigneeId) {
    changes.assigneeId = { from: current.assigneeId, to: input.assigneeId };
  }
  if (input.dueDate !== undefined && input.dueDate?.getTime() !== current.dueDate?.getTime()) {
    changes.dueDate = {
      from: current.dueDate ? current.dueDate.toISOString() : null,
      to: input.dueDate ? input.dueDate.toISOString() : null,
    };
  }
  if (input.position !== undefined && input.position !== current.position) {
    changes.position = { from: current.position, to: input.position };
  }

  return changes;
}