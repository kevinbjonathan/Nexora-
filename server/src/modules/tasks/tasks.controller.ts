import type { Request, Response } from "express";
import { body, params, query } from "../../middleware/validate.js";
import type { ProjectIdParams } from "../projects/projects.schemas.js";
import {
  archiveTask,
  createTask,
  getTask,
  listTasks,
  reorderTasks,
  updateTask,
} from "./tasks.service.js";
import type {
  CreateTaskInput,
  ListTasksInput,
  ReorderTasksInput,
  TaskIdParams,
  UpdateTaskInput,
} from "./tasks.schemas.js";

export const tasksController = {
  async create(req: Request, res: Response) {
    const { projectId } = params<ProjectIdParams>(req);
    const task = await createTask(req.auth!.user.id, projectId, body<CreateTaskInput>(req));
    res.status(201).json({ task });
  },

  async list(req: Request, res: Response) {
    const { projectId } = params<ProjectIdParams>(req);
    const input = query<ListTasksInput>(req);
    const result = await listTasks(req.auth!.user.id, projectId, input.page, input.pageSize, {
      status: input.status,
      priority: input.priority,
      assigneeId: input.assigneeId,
      includeArchived: input.includeArchived,
    });
    res.json(result);
  },

  async get(req: Request, res: Response) {
    const { taskId } = params<TaskIdParams>(req);
    const result = await getTask(req.auth!.user.id, taskId);
    res.json(result);
  },

  async update(req: Request, res: Response) {
    const { taskId } = params<TaskIdParams>(req);
    const task = await updateTask(req.auth!.user.id, taskId, body<UpdateTaskInput>(req));
    res.json({ task });
  },

  async archive(req: Request, res: Response) {
    const { taskId } = params<TaskIdParams>(req);
    const task = await archiveTask(req.auth!.user.id, taskId);
    res.json({ task });
  },

  async reorder(req: Request, res: Response) {
    const { projectId } = params<ProjectIdParams>(req);
    const result = await reorderTasks(req.auth!.user.id, projectId, body<ReorderTasksInput>(req));
    res.json(result);
  },
};