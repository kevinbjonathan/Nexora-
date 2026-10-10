import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateParams } from "../../middleware/validate.js";
import { workspaceIdParamsSchema } from "../workspaces/workspaces.schemas.js";
import { dashboardController } from "./dashboard.controller.js";

export const dashboardRouter = Router({ mergeParams: true });

dashboardRouter.use(authenticate);

dashboardRouter.get(
  "/",
  validateParams(workspaceIdParamsSchema),
  dashboardController.get,
);