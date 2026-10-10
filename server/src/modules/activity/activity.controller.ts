import type { Request, Response } from "express";
import { params, query } from "../../middleware/validate.js";
import type { WorkspaceIdParams } from "../workspaces/workspaces.schemas.js";
import { listActivity } from "./activity.service.js";
import type { ListActivityInput } from "./activity.schemas.js";

export const activityController = {
  async list(req: Request, res: Response) {
    const { workspaceId } = params<WorkspaceIdParams>(req);
    const input = query<ListActivityInput>(req);
    const result = await listActivity(
      req.auth!.user.id,
      workspaceId,
      input.page,
      input.pageSize,
      {
        projectId: input.projectId,
        taskId: input.taskId,
        action: input.action,
      },
    );
    res.json(result);
  },
};