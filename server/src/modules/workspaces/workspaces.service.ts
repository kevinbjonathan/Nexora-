import type { Prisma, Workspace, WorkspaceRole } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";
import { buildPaginatedResult, toSkipTake } from "../../utils/pagination.js";
import { runInTransaction } from "../../lib/events.js";
import { recordActivity } from "../activity/activity.service.js";
import { generateOpaqueToken, hashToken } from "../auth/session.service.js";
import { assertWorkspacePermission, getWorkspaceMembershipOrThrow } from "../access/access.service.js";
import { emitToUser, emitToWorkspace } from "../../realtime/emitter.js";
import type {
  CreateWorkspaceInput,
  InviteMemberInput,
  UpdateMemberRoleInput,
  UpdateWorkspaceInput,
} from "./workspaces.schemas.js";

const INVITATION_TTL_DAYS = 7;

export function serializeWorkspace(workspace: Workspace, role?: WorkspaceRole) {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    description: workspace.description,
    archivedAt: workspace.archivedAt,
    role,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
}

export function serializeInvitation(invitation: {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: invitation.id,
    workspaceId: invitation.workspaceId,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    createdAt: invitation.createdAt,
  };
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "workspace";
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let index = 1;
  while (await prisma.workspace.findUnique({ where: { slug } })) {
    slug = `${base}-${index++}`;
  }
  return slug;
}

export async function createWorkspace(userId: string, input: CreateWorkspaceInput) {
  const slug = await uniqueSlug(input.name);

  const workspace = await runInTransaction(async (tx) => {
    const created = await tx.workspace.create({
      data: {
        name: input.name.trim(),
        slug,
        description: input.description ?? null,
        createdById: userId,
      },
    });

    await tx.workspaceMembership.create({
      data: { workspaceId: created.id, userId, role: "ADMIN" },
    });

    await recordActivity(
      {
        workspaceId: created.id,
        entityType: "WORKSPACE",
        entityId: created.id,
        action: "workspace_created",
        actorId: userId,
        summary: "Workspace created",
      },
      tx,
    );

    return created;
  });

  return serializeWorkspace(workspace, "ADMIN");
}

export async function listWorkspaces(
  userId: string,
  page: number,
  pageSize: number,
  includeArchived: boolean,
  search: string,
) {
  const term = search.trim();
  const workspaceFilter: Prisma.WorkspaceWhereInput = {
    ...(includeArchived ? {} : { archivedAt: null }),
    ...(term
      ? {
          OR: [
            { name: { contains: term, mode: "insensitive" as const } },
            { description: { contains: term, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const where: Prisma.WorkspaceMembershipWhereInput = {
    userId,
    workspace: workspaceFilter,
  };

  const { skip, take } = toSkipTake(page, pageSize);
  const [memberships, total] = await Promise.all([
    prisma.workspaceMembership.findMany({
      where,
      include: { workspace: true },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.workspaceMembership.count({ where }),
  ]);

  const items = memberships.map((membership) =>
    serializeWorkspace(membership.workspace, membership.role),
  );

  return buildPaginatedResult(items, total, page, pageSize);
}

export async function getWorkspace(userId: string, workspaceId: string) {
  const membership = await getWorkspaceMembershipOrThrow(userId, workspaceId);
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  return serializeWorkspace(workspace, membership.role);
}

export async function updateWorkspace(userId: string, workspaceId: string, input: UpdateWorkspaceInput) {
  await assertWorkspacePermission(userId, workspaceId, "workspace:update");

  const updated = await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    },
  });

  await recordActivity({
    workspaceId,
    entityType: "WORKSPACE",
    entityId: workspaceId,
    action: "workspace_updated",
    actorId: userId,
    summary: "Workspace details updated",
  });
  emitToWorkspace(workspaceId, "workspace:updated", serializeWorkspace(updated));

  return serializeWorkspace(updated);
}

export async function archiveWorkspace(userId: string, workspaceId: string) {
  await assertWorkspacePermission(userId, workspaceId, "workspace:archive");

  const updated = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { archivedAt: new Date() },
  });

  await recordActivity({
    workspaceId,
    entityType: "WORKSPACE",
    entityId: workspaceId,
    action: "workspace_archived",
    actorId: userId,
    summary: "Workspace archived",
  });
  emitToWorkspace(workspaceId, "workspace:archived", serializeWorkspace(updated));

  return serializeWorkspace(updated);
}

export async function listMembers(
  userId: string,
  workspaceId: string,
  page: number,
  pageSize: number,
) {
  await assertWorkspacePermission(userId, workspaceId, "workspace:view");

  const where: Prisma.WorkspaceMembershipWhereInput = { workspaceId };
  const { skip, take } = toSkipTake(page, pageSize);

  const [memberships, total] = await Promise.all([
    prisma.workspaceMembership.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      skip,
      take,
      orderBy: { joinedAt: "asc" },
    }),
    prisma.workspaceMembership.count({ where }),
  ]);

  const items = memberships.map((membership) => ({
    id: membership.id,
    role: membership.role,
    joinedAt: membership.joinedAt,
    user: membership.user,
  }));

  return buildPaginatedResult(items, total, page, pageSize);
}

export async function updateMemberRole(
  userId: string,
  workspaceId: string,
  targetUserId: string,
  role: UpdateMemberRoleInput["role"],
) {
  await assertWorkspacePermission(userId, workspaceId, "workspace:manage_members");

  if (targetUserId === userId) {
    throw ApiError.badRequest("You cannot change your own role this way.");
  }

  const target = await prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
  });
  if (!target) {
    throw ApiError.notFound("Member not found.");
  }

  if (target.role === "ADMIN" && role !== "ADMIN") {
    const adminCount = await prisma.workspaceMembership.count({
      where: { workspaceId, role: "ADMIN" },
    });
    if (adminCount <= 1) {
      throw ApiError.badRequest("A workspace must keep at least one admin.");
    }
  }

  await prisma.workspaceMembership.update({
    where: { id: target.id },
    data: { role },
  });

  await recordActivity({
    workspaceId,
    entityType: "WORKSPACE_MEMBER",
    entityId: target.id,
    action: "member_role_changed",
    actorId: userId,
    metadata: { from: target.role, to: role },
    summary: `Role changed from ${target.role} to ${role}`,
  });

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { email: true },
  });
  if (targetUser) {
    emitToUser(targetUserId, "workspace:member_role_changed", {
      workspaceId,
      role,
    });
  }

  return { role };
}

export async function removeMember(userId: string, workspaceId: string, targetUserId: string) {
  await assertWorkspacePermission(userId, workspaceId, "workspace:manage_members");

  const target = await prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
  });
  if (!target) {
    throw ApiError.notFound("Member not found.");
  }

  if (target.role === "ADMIN") {
    const adminCount = await prisma.workspaceMembership.count({
      where: { workspaceId, role: "ADMIN" },
    });
    if (adminCount <= 1) {
      throw ApiError.badRequest("A workspace must keep at least one admin.");
    }
  }

  await prisma.workspaceMembership.delete({ where: { id: target.id } });

  await recordActivity({
    workspaceId,
    entityType: "WORKSPACE_MEMBER",
    entityId: target.id,
    action: "member_removed",
    actorId: userId,
    summary: "Member removed",
  });

  emitToUser(targetUserId, "workspace:member_removed", { workspaceId });
}

export async function inviteMember(userId: string, workspaceId: string, input: InviteMemberInput) {
  await assertWorkspacePermission(userId, workspaceId, "invitation:manage");

  const email = input.email.trim().toLowerCase();
  const existingInvite = await prisma.workspaceInvitation.findUnique({
    where: { workspaceId_email: { workspaceId, email } },
  });

  if (existingInvite && !existingInvite.acceptedAt) {
    throw ApiError.conflict("An invitation was already sent to this email.");
  }
  if (existingInvite) {
    await prisma.workspaceInvitation.delete({ where: { id: existingInvite.id } });
  }

  const existingMember = await prisma.user.findUnique({ where: { email } });
  if (existingMember) {
    const membership = await prisma.workspaceMembership.findUnique({
      where: { userId_workspaceId: { userId: existingMember.id, workspaceId } },
    });
    if (membership) {
      throw ApiError.conflict("This user is already a member of the workspace.");
    }
  }

  const token = generateOpaqueToken();
  const invitation = await prisma.workspaceInvitation.create({
    data: {
      workspaceId,
      email,
      role: input.role,
      tokenHash: hashToken(token),
      invitedById: userId,
      expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  await recordActivity({
    workspaceId,
    entityType: "INVITATION",
    entityId: invitation.id,
    action: "invitation_sent",
    actorId: userId,
    metadata: { email },
    summary: `Invitation sent to ${email}`,
  });

  const isProduction = process.env.NODE_ENV === "production";
  return { invitation: serializeInvitation(invitation), token: isProduction ? undefined : token };
}

export async function acceptInvitation(userId: string, token: string) {
  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!invitation || invitation.acceptedAt || invitation.expiresAt.getTime() <= Date.now()) {
    throw ApiError.badRequest("This invitation is invalid or has expired.");
  }

  const existing = await prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: invitation.workspaceId } },
  });
  if (existing) {
    throw ApiError.conflict("You are already a member of this workspace.");
  }

  const workspace = await runInTransaction(async (tx) => {
    await tx.workspaceMembership.create({
      data: { workspaceId: invitation.workspaceId, userId, role: invitation.role },
    });
    await tx.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
    await recordActivity(
      {
        workspaceId: invitation.workspaceId,
        entityType: "WORKSPACE_MEMBER",
        entityId: invitation.id,
        action: "member_added",
        actorId: userId,
        summary: "Member joined via invitation",
      },
      tx,
    );
    return tx.workspace.findUniqueOrThrow({ where: { id: invitation.workspaceId } });
  });

  emitToWorkspace(invitation.workspaceId, "workspace:member_added", { workspaceId: workspace.id });
  return serializeWorkspace(workspace, invitation.role);
}

export async function leaveWorkspace(userId: string, workspaceId: string) {
  const membership = await getWorkspaceMembershipOrThrow(userId, workspaceId);

  if (membership.role === "ADMIN") {
    const adminCount = await prisma.workspaceMembership.count({
      where: { workspaceId, role: "ADMIN" },
    });
    if (adminCount <= 1) {
      throw ApiError.badRequest(
        "You are the last admin. Transfer ownership to another member before leaving.",
      );
    }
  }

  await prisma.workspaceMembership.delete({ where: { id: membership.id } });

  await recordActivity({
    workspaceId,
    entityType: "WORKSPACE_MEMBER",
    entityId: membership.id,
    action: "member_left",
    actorId: userId,
    summary: "Member left workspace",
  });
}