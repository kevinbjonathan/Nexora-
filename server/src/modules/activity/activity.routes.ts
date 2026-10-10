import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateParams, validateQuery } from "../../middleware/validate.js";
import { workspaceIdParamsSchema } from "../workspaces/workspaces.schemas.js";
import { activityController } from "./activity.controller.js";
import { listActivitySchema } from "./activity.schemas.js";

export const activityRouter = Router({ mergeParams: true });

activityRouter.use(authenticate);

activityRouter.get(
  "/",
  validateParams(workspaceIdParamsSchema),
  validateQuery(listActivitySchema),
  activityController.list,
);