import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate.js";
import { workspaceIdParamsSchema } from "../workspaces/workspaces.schemas.js";
import { projectsController } from "./projects.controller.js";
import {
  addProjectMemberSchema,
  createProjectSchema,
  listProjectsSchema,
  projectIdParamsSchema,
  projectMemberParamsSchema,
  updateProjectMemberRoleSchema,
  updateProjectSchema,
} from "./projects.schemas.js";

export const projectsRouter = Router({ mergeParams: true });

projectsRouter.use(authenticate);

projectsRouter.get(
  "/",
  validateParams(workspaceIdParamsSchema),
  validateQuery(listProjectsSchema),
  projectsController.list,
);
projectsRouter.post(
  "/",
  validateParams(workspaceIdParamsSchema),
  validateBody(createProjectSchema),
  projectsController.create,
);
projectsRouter.get(
  "/:projectId",
  validateParams(projectIdParamsSchema),
  projectsController.get,
);
projectsRouter.patch(
  "/:projectId",
  validateParams(projectIdParamsSchema),
  validateBody(updateProjectSchema),
  projectsController.update,
);
projectsRouter.post(
  "/:projectId/archive",
  validateParams(projectIdParamsSchema),
  projectsController.archive,
);
projectsRouter.post(
  "/:projectId/members",
  validateParams(projectIdParamsSchema),
  validateBody(addProjectMemberSchema),
  projectsController.addMember,
);
projectsRouter.patch(
  "/:projectId/members/:userId",
  validateParams(projectMemberParamsSchema),
  validateBody(updateProjectMemberRoleSchema),
  projectsController.updateMemberRole,
);
projectsRouter.delete(
  "/:projectId/members/:userId",
  validateParams(projectMemberParamsSchema),
  projectsController.removeMember,
);