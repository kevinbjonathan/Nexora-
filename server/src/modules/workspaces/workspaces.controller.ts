import type { Request, Response } from "express";
import { body, params, query } from "../../middleware/validate.js";
import {
  acceptInvitation,
  archiveWorkspace,
  createWorkspace,
  getWorkspace,
  inviteMember,
  leaveWorkspace,
  listMembers,
  listWorkspaces,
  removeMember,
  updateMemberRole,
  updateWorkspace,
} from "./workspaces.service.js";
import type {
  AcceptInvitationInput,
  CreateWorkspaceInput,
  InviteMemberInput,
  ListWorkspacesInput,
  UpdateMemberRoleInput,
  UpdateWorkspaceInput,
  WorkspaceIdParams,
  WorkspaceMemberParams,
} from "./workspaces.schemas.js";

export const workspacesController = {
  async create(req: Request, res: Response) {
    const workspace = await createWorkspace(req.auth!.user.id, body<CreateWorkspaceInput>(req));
    res.status(201).json({ workspace });
  },

  async list(req: Request, res: Response) {
    const input = query<ListWorkspacesInput>(req);
    const result = await listWorkspaces(
      req.auth!.user.id,
      input.page,
      input.pageSize,
      input.includeArchived,
      input.search,
    );
    res.json(result);
  },

  async get(req: Request, res: Response) {
    const { workspaceId } = params<WorkspaceIdParams>(req);
    const workspace = await getWorkspace(req.auth!.user.id, workspaceId);
    res.json({ workspace });
  },

  async update(req: Request, res: Response) {
    const { workspaceId } = params<WorkspaceIdParams>(req);
    const workspace = await updateWorkspace(
      req.auth!.user.id,
      workspaceId,
      body<UpdateWorkspaceInput>(req),
    );
    res.json({ workspace });
  },

  async archive(req: Request, res: Response) {
    const { workspaceId } = params<WorkspaceIdParams>(req);
    const workspace = await archiveWorkspace(req.auth!.user.id, workspaceId);
    res.json({ workspace });
  },

  async listMembers(req: Request, res: Response) {
    const { workspaceId } = params<WorkspaceIdParams>(req);
    const input = query<ListWorkspacesInput>(req);
    const result = await listMembers(
      req.auth!.user.id,
      workspaceId,
      input.page,
      input.pageSize,
    );
    res.json(result);
  },

  async updateMemberRole(req: Request, res: Response) {
    const { workspaceId, userId } = params<WorkspaceMemberParams>(req);
    const result = await updateMemberRole(
      req.auth!.user.id,
      workspaceId,
      userId,
      body<UpdateMemberRoleInput>(req).role,
    );
    res.json(result);
  },

  async removeMember(req: Request, res: Response) {
    const { workspaceId, userId } = params<WorkspaceMemberParams>(req);
    await removeMember(req.auth!.user.id, workspaceId, userId);
    res.status(204).send();
  },

  async invite(req: Request, res: Response) {
    const { workspaceId } = params<WorkspaceIdParams>(req);
    const result = await inviteMember(
      req.auth!.user.id,
      workspaceId,
      body<InviteMemberInput>(req),
    );
    res.status(201).json(result);
  },

  async acceptInvitation(req: Request, res: Response) {
    const workspace = await acceptInvitation(
      req.auth!.user.id,
      body<AcceptInvitationInput>(req).token,
    );
    res.status(201).json({ workspace });
  },

  async leave(req: Request, res: Response) {
    const { workspaceId } = params<WorkspaceIdParams>(req);
    await leaveWorkspace(req.auth!.user.id, workspaceId);
    res.status(204).send();
  },
};