import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate.js";
import { paginationSchema } from "../../utils/pagination.js";
import { workspacesController } from "./workspaces.controller.js";
import {
  acceptInvitationSchema,
  createWorkspaceSchema,
  inviteMemberSchema,
  listWorkspacesSchema,
  updateMemberRoleSchema,
  updateWorkspaceSchema,
  workspaceIdParamsSchema,
  workspaceMemberParamsSchema,
} from "./workspaces.schemas.js";

export const workspacesRouter = Router();

workspacesRouter.use(authenticate);

workspacesRouter.get("/", validateQuery(listWorkspacesSchema), workspacesController.list);
workspacesRouter.post("/", validateBody(createWorkspaceSchema), workspacesController.create);
workspacesRouter.post(
  "/invitations/accept",
  validateBody(acceptInvitationSchema),
  workspacesController.acceptInvitation,
);

workspacesRouter.get(
  "/:workspaceId",
  validateParams(workspaceIdParamsSchema),
  workspacesController.get,
);
workspacesRouter.patch(
  "/:workspaceId",
  validateParams(workspaceIdParamsSchema),
  validateBody(updateWorkspaceSchema),
  workspacesController.update,
);
workspacesRouter.post(
  "/:workspaceId/archive",
  validateParams(workspaceIdParamsSchema),
  workspacesController.archive,
);
workspacesRouter.post(
  "/:workspaceId/leave",
  validateParams(workspaceIdParamsSchema),
  workspacesController.leave,
);
workspacesRouter.get(
  "/:workspaceId/members",
  validateParams(workspaceIdParamsSchema),
  validateQuery(paginationSchema),
  workspacesController.listMembers,
);
workspacesRouter.patch(
  "/:workspaceId/members/:userId",
  validateParams(workspaceMemberParamsSchema),
  validateBody(updateMemberRoleSchema),
  workspacesController.updateMemberRole,
);
workspacesRouter.delete(
  "/:workspaceId/members/:userId",
  validateParams(workspaceMemberParamsSchema),
  workspacesController.removeMember,
);
workspacesRouter.post(
  "/:workspaceId/invitations",
  validateParams(workspaceIdParamsSchema),
  validateBody(inviteMemberSchema),
  workspacesController.invite,
);