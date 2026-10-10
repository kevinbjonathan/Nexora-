import type { Request, Response } from "express";
import { body, params, query } from "../../middleware/validate.js";
import {
  addProjectMember,
  archiveProject,
  createProject,
  getProject,
  listProjects,
  removeProjectMember,
  updateProject,
  updateProjectMemberRole,
} from "./projects.service.js";
import type {
  AddProjectMemberInput,
  CreateProjectInput,
  ListProjectsInput,
  ProjectIdParams,
  ProjectMemberParams,
  UpdateProjectInput,
  UpdateProjectMemberRoleInput,
} from "./projects.schemas.js";
import type { WorkspaceIdParams } from "../workspaces/workspaces.schemas.js";

export const projectsController = {
  async create(req: Request, res: Response) {
    const { workspaceId } = params<WorkspaceIdParams>(req);
    const project = await createProject(
      req.auth!.user.id,
      workspaceId,
      body<CreateProjectInput>(req),
    );
    res.status(201).json({ project });
  },

  async list(req: Request, res: Response) {
    const { workspaceId } = params<WorkspaceIdParams>(req);
    const input = query<ListProjectsInput>(req);
    const result = await listProjects(
      req.auth!.user.id,
      workspaceId,
      input.page,
      input.pageSize,
      input.status,
      input.includeArchived,
    );
    res.json(result);
  },

  async get(req: Request, res: Response) {
    const { projectId } = params<ProjectIdParams>(req);
    const result = await getProject(req.auth!.user.id, projectId);
    res.json(result);
  },

  async update(req: Request, res: Response) {
    const { projectId } = params<ProjectIdParams>(req);
    const project = await updateProject(
      req.auth!.user.id,
      projectId,
      body<UpdateProjectInput>(req),
    );
    res.json({ project });
  },

  async archive(req: Request, res: Response) {
    const { projectId } = params<ProjectIdParams>(req);
    const project = await archiveProject(req.auth!.user.id, projectId);
    res.json({ project });
  },

  async addMember(req: Request, res: Response) {
    const { projectId } = params<ProjectIdParams>(req);
    const member = await addProjectMember(
      req.auth!.user.id,
      projectId,
      body<AddProjectMemberInput>(req),
    );
    res.status(201).json({ member });
  },

  async updateMemberRole(req: Request, res: Response) {
    const { projectId, userId } = params<ProjectMemberParams>(req);
    const result = await updateProjectMemberRole(
      req.auth!.user.id,
      projectId,
      userId,
      body<UpdateProjectMemberRoleInput>(req).role,
    );
    res.json(result);
  },

  async removeMember(req: Request, res: Response) {
    const { projectId, userId } = params<ProjectMemberParams>(req);
    await removeProjectMember(req.auth!.user.id, projectId, userId);
    res.status(204).send();
  },
};