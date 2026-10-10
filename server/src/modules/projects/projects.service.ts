import type { Prisma, Project } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";
import { buildPaginatedResult, toSkipTake } from "../../utils/pagination.js";
import { runInTransaction } from "../../lib/events.js";
import { recordActivity } from "../activity/activity.service.js";
import { createNotification } from "../notifications/notifications.service.js";
import {
  assertProjectAccess,
  assertWorkspacePermission,
  getWorkspaceMembershipOrThrow,
} from "../access/access.service.js";
import { emitToWorkspace } from "../../realtime/emitter.js";
import type {
  AddProjectMemberInput,
  CreateProjectInput,
  UpdateProjectInput,
} from "./projects.schemas.js";

export interface ProjectProgressResult {
  progress: number;
  tasksCount: number;
}

// Progress = percentage of a project's active (non-archived) tasks whose status
// is DONE, rounded to the nearest integer. Projects with no active tasks return 0.
// Archived tasks are excluded so progress matches the API's default "active tasks"
// convention (lists hide archived tasks unless explicitly requested).
async function progressByProject(projectIds: string[]): Promise<Map<string, number>> {
  const progress = new Map<string, number>();
  if (projectIds.length === 0) {
    return progress;
  }

  const grouped = await prisma.task.groupBy({
    by: ["projectId", "status"],
    where: { projectId: { in: projectIds }, archivedAt: null },
    _count: { _all: true },
  });

  const totals = new Map<string, number>();
  const done = new Map<string, number>();
  for (const row of grouped) {
    totals.set(row.projectId, (totals.get(row.projectId) ?? 0) + row._count._all);
    if (row.status === "DONE") {
      done.set(row.projectId, (done.get(row.projectId) ?? 0) + row._count._all);
    }
  }

  for (const projectId of projectIds) {
    const total = totals.get(projectId) ?? 0;
    const completed = done.get(projectId) ?? 0;
    progress.set(projectId, total === 0 ? 0 : Math.round((completed / total) * 100));
  }

  return progress;
}

export function serializeProject(
  project: Project,
  extras?: { tasksCount?: number; progress?: number },
) {
  return {
    id: project.id,
    workspaceId: project.workspaceId,
    name: project.name,
    description: project.description,
    status: project.status,
    priority: project.priority,
    ownerId: project.ownerId,
    startDate: project.startDate,
    dueDate: project.dueDate,
    archivedAt: project.archivedAt,
    progress: extras?.progress ?? 0,
    tasksCount: extras?.tasksCount,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export async function createProject(userId: string, workspaceId: string, input: CreateProjectInput) {
  await assertWorkspacePermission(userId, workspaceId, "project:create");

  const ownerId = input.ownerId ?? userId;
  if (ownerId !== userId) {
    // Owners must belong to the workspace.
    await getWorkspaceMembershipOrThrow(ownerId, workspaceId);
  }

  const project = await runInTransaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        workspaceId,
        name: input.name.trim(),
        description: input.description ?? null,
        status: (input.status as Project["status"]) ?? "PLANNING",
        priority: (input.priority as Project["priority"]) ?? "MEDIUM",
        ownerId,
        createdById: userId,
        startDate: input.startDate ?? null,
        dueDate: input.dueDate ?? null,
      },
    });

    await tx.projectMember.create({
      data: { projectId: created.id, userId, role: "PROJECT_MANAGER" },
    });

    await recordActivity(
      {
        workspaceId,
        projectId: created.id,
        entityType: "PROJECT",
        entityId: created.id,
        action: "project_created",
        actorId: userId,
        summary: "Project created",
      },
      tx,
    );

    return created;
  });

  // A fresh project has no tasks yet, so its derived progress is always 0.
  emitToWorkspace(workspaceId, "project:created", serializeProject(project, { progress: 0 }));
  return serializeProject(project, { progress: 0 });
}

export async function listProjects(
  userId: string,
  workspaceId: string,
  page: number,
  pageSize: number,
  status?: string,
  includeArchived = false,
) {
  await assertWorkspacePermission(userId, workspaceId, "project:view");

  const where: Prisma.ProjectWhereInput = {
    workspaceId,
    ...(status ? { status: status as Project["status"] } : {}),
    ...(includeArchived ? {} : { archivedAt: null }),
  };

  const { skip, take } = toSkipTake(page, pageSize);
  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: { _count: { select: { tasks: true } } },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.count({ where }),
  ]);

  // One grouped query computes progress for every project on the page (no N+1).
  const progress = await progressByProject(projects.map((project) => project.id));

  const items = projects.map((project) =>
    serializeProject(project, {
      tasksCount: project._count.tasks,
      progress: progress.get(project.id) ?? 0,
    }),
  );
  return buildPaginatedResult(items, total, page, pageSize);
}

export async function getProject(userId: string, projectId: string) {
  await assertProjectAccess(userId, projectId, "project:view");
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      _count: { select: { tasks: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      },
    },
  });

  const progress = (await progressByProject([project.id])).get(project.id) ?? 0;

  return {
    project: serializeProject(project, { tasksCount: project._count.tasks, progress }),
    members: project.members.map((member) => ({
      id: member.id,
      role: member.role,
      user: member.user,
    })),
  };
}

export async function updateProject(userId: string, projectId: string, input: UpdateProjectInput) {
  const access = await assertProjectAccess(userId, projectId, "project:update");

  const data: Prisma.ProjectUpdateInput = {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
    ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
    ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
    ...(input.ownerId !== undefined
      ? { owner: { connect: { id: input.ownerId } } }
      : {}),
  };

  const updated = await prisma.project.update({ where: { id: projectId }, data });

  await recordActivity({
    workspaceId: access.workspaceId,
    projectId,
    entityType: "PROJECT",
    entityId: projectId,
    action: "project_updated",
    actorId: userId,
    summary: "Project details updated",
  });
  const progress = (await progressByProject([projectId])).get(projectId) ?? 0;
  emitToWorkspace(access.workspaceId, "project:updated", serializeProject(updated, { progress }));

  return serializeProject(updated, { progress });
}

export async function archiveProject(userId: string, projectId: string) {
  const access = await assertProjectAccess(userId, projectId, "project:archive");

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { archivedAt: new Date() },
  });

  await recordActivity({
    workspaceId: access.workspaceId,
    projectId,
    entityType: "PROJECT",
    entityId: projectId,
    action: "project_archived",
    actorId: userId,
    summary: "Project archived",
  });
  const progress = (await progressByProject([projectId])).get(projectId) ?? 0;
  emitToWorkspace(access.workspaceId, "project:archived", serializeProject(updated, { progress }));

  return serializeProject(updated, { progress });
}

export async function addProjectMember(
  userId: string,
  projectId: string,
  input: AddProjectMemberInput,
) {
  const access = await assertProjectAccess(userId, projectId, "project:manage_members");

  await getWorkspaceMembershipOrThrow(input.userId, access.workspaceId);

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: input.userId } },
  });

  if (existing) {
    throw ApiError.conflict("This user is already a member of the project.");
  }

  const member = await prisma.projectMember.create({
    data: {
      projectId,
      userId: input.userId,
      role: input.role ?? "TEAM_MEMBER",
      addedById: userId,
    },
  });

  await recordActivity({
    workspaceId: access.workspaceId,
    projectId,
    entityType: "PROJECT_MEMBER",
    entityId: member.id,
    action: "member_added",
    actorId: userId,
    metadata: { userId: input.userId },
    summary: "Member added to project",
  });
  emitToWorkspace(access.workspaceId, "project:member_added", { projectId, member });

  if (input.userId !== userId) {
    await createNotification({
      recipientId: input.userId,
      workspaceId: access.workspaceId,
      actorId: userId,
      type: "PROJECT_MEMBER_ADDED",
      title: "You were added to a project",
      body: "You have been added to the project team.",
      targetType: "PROJECT",
      targetId: projectId,
      dedupeKey: `project_member_added:${projectId}:${input.userId}`,
    });
  }

  return serializeMember(member);
}

export async function updateProjectMemberRole(
  userId: string,
  projectId: string,
  targetUserId: string,
  role: "PROJECT_MANAGER" | "TEAM_MEMBER" | "VIEWER",
) {
  const access = await assertProjectAccess(userId, projectId, "project:manage_members");

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
  if (!member) {
    throw ApiError.notFound("Project member not found.");
  }

  const updated = await prisma.projectMember.update({
    where: { id: member.id },
    data: { role },
  });

  await recordActivity({
    workspaceId: access.workspaceId,
    projectId,
    entityType: "PROJECT_MEMBER",
    entityId: member.id,
    action: "member_role_changed",
    actorId: userId,
    metadata: { from: member.role, to: role },
    summary: "Project member role changed",
  });
  emitToWorkspace(access.workspaceId, "project:member_role_changed", { projectId, member: updated });

  return serializeMember(updated);
}

export async function removeProjectMember(userId: string, projectId: string, targetUserId: string) {
  const access = await assertProjectAccess(userId, projectId, "project:manage_members");

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
  if (!member) {
    throw ApiError.notFound("Project member not found.");
  }

  await prisma.projectMember.delete({ where: { id: member.id } });

  await recordActivity({
    workspaceId: access.workspaceId,
    projectId,
    entityType: "PROJECT_MEMBER",
    entityId: member.id,
    action: "member_removed",
    actorId: userId,
    metadata: { userId: targetUserId },
    summary: "Member removed from project",
  });
  emitToWorkspace(access.workspaceId, "project:member_removed", { projectId, member });
}

function serializeMember(member: { id: string; projectId: string; userId: string; role: string | null }) {
  return { id: member.id, projectId: member.projectId, userId: member.userId, role: member.role };
}