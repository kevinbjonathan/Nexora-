import type { WorkspaceMembership } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";
import { roleHasPermission, type Permission } from "./permissions.js";

export async function getWorkspaceMembershipOrThrow(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceMembership> {
  const membership = await prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });

  // A non-member must not be able to distinguish "missing" from "no access".
  if (!membership) {
    throw ApiError.notFound("Workspace not found.");
  }
  return membership;
}

export async function assertWorkspacePermission(
  userId: string,
  workspaceId: string,
  permission: Permission,
): Promise<WorkspaceMembership> {
  const membership = await getWorkspaceMembershipOrThrow(userId, workspaceId);
  if (!roleHasPermission(membership.role, permission)) {
    throw ApiError.forbidden();
  }
  return membership;
}

export interface ProjectAccess {
  project: { id: string; workspaceId: string; ownerId: string; [key: string]: unknown };
  membership: WorkspaceMembership;
}

export async function assertProjectAccess(
  userId: string,
  projectId: string,
  permission: Permission = "project:view",
): Promise<{ projectId: string; workspaceId: string; membership: WorkspaceMembership }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, workspaceId: true },
  });
  if (!project) {
    throw ApiError.notFound("Project not found.");
  }

  const membership = await prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: project.workspaceId } },
  });
  if (!membership) {
    throw ApiError.notFound("Project not found.");
  }
  if (!roleHasPermission(membership.role, permission)) {
    throw ApiError.forbidden();
  }

  return { projectId: project.id, workspaceId: project.workspaceId, membership };
}

export async function assertTaskAccess(
  userId: string,
  taskId: string,
  permission: Permission = "task:view",
): Promise<{ taskId: string; projectId: string; workspaceId: string; membership: WorkspaceMembership }> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true, project: { select: { workspaceId: true } } },
  });
  if (!task) {
    throw ApiError.notFound("Task not found.");
  }

  const workspaceId = task.project.workspaceId;
  const membership = await prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  if (!membership) {
    throw ApiError.notFound("Task not found.");
  }
  if (!roleHasPermission(membership.role, permission)) {
    throw ApiError.forbidden();
  }

  return { taskId: task.id, projectId: task.projectId, workspaceId, membership };
}
