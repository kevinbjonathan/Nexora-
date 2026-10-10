import { z } from "zod";
import { paginationSchema } from "../../utils/pagination.js";
import { uuidSchema } from "../users/users.schemas.js";

const workspaceRoleSchema = z.enum(["ADMIN", "PROJECT_MANAGER", "TEAM_MEMBER", "VIEWER"]);

const nameSchema = z.string().trim().min(1, "Name is required.").max(120);

export const workspaceIdParamsSchema = z.object({ workspaceId: uuidSchema });

export const workspaceMemberParamsSchema = z.object({
  workspaceId: uuidSchema,
  userId: uuidSchema,
});

export const workspaceTokenParamsSchema = z.object({
  token: z.string().min(1, "Invitation token is required."),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Invitation token is required."),
});

export const createWorkspaceSchema = z.object({
  name: nameSchema,
  description: z.string().trim().max(2000).optional(),
});

export const updateWorkspaceSchema = z
  .object({
    name: nameSchema.optional(),
    description: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((value) => value.name !== undefined || value.description !== undefined, {
    message: "At least one field must be provided.",
  });

export const listWorkspacesSchema = paginationSchema.extend({
  includeArchived: z.coerce.boolean().optional().default(false),
  search: z.string().trim().max(120).optional().default(""),
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().min(3).max(254).email("Enter a valid email address."),
  role: workspaceRoleSchema.default("TEAM_MEMBER"),
});

export const updateMemberRoleSchema = z.object({
  role: workspaceRoleSchema,
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type ListWorkspacesInput = z.infer<typeof listWorkspacesSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type WorkspaceIdParams = z.infer<typeof workspaceIdParamsSchema>;
export type WorkspaceMemberParams = z.infer<typeof workspaceMemberParamsSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;