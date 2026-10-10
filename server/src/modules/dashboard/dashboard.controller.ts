import type { Request, Response } from "express";
import { params } from "../../middleware/validate.js";
import type { WorkspaceIdParams } from "../workspaces/workspaces.schemas.js";
import { getWorkspaceDashboard } from "./dashboard.service.js";

export const dashboardController = {
  async get(req: Request, res: Response) {
    const { workspaceId } = params<WorkspaceIdParams>(req);
    const dashboard = await getWorkspaceDashboard(req.auth!.user.id, workspaceId);
    res.json(dashboard);
  },
};