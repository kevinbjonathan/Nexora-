import { z } from "zod";
import { paginationSchema } from "../../utils/pagination.js";
import { uuidSchema } from "../users/users.schemas.js";

const nameSchema = z.string().trim().min(1, "Name is required.").max(160);

const dateSchema = z.coerce.date().optional();

export const projectIdParamsSchema = z.object({ projectId: uuidSchema });

export const projectMemberParamsSchema = z.object({
  projectId: uuidSchema,
  userId: uuidSchema,
});

export const createProjectSchema = z.object({
  name: nameSchema,
  description: z.string().trim().max(2000).optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  startDate: dateSchema,
  dueDate: dateSchema,
  ownerId: uuidSchema.optional(),
});

export const updateProjectSchema = z
  .object({
    name: nameSchema.optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    startDate: dateSchema,
    dueDate: dateSchema,
    ownerId: uuidSchema.optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.description !== undefined ||
      value.status !== undefined ||
      value.priority !== undefined ||
      value.startDate !== undefined ||
      value.dueDate !== undefined ||
      value.ownerId !== undefined,
    { message: "At least one field must be provided." },
  );

export const listProjectsSchema = paginationSchema.extend({
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(),
  includeArchived: z.coerce.boolean().optional().default(false),
});

export const addProjectMemberSchema = z.object({
  userId: uuidSchema,
  role: z.enum(["PROJECT_MANAGER", "TEAM_MEMBER"]).optional(),
});

export const updateProjectMemberRoleSchema = z.object({
  role: z.enum(["PROJECT_MANAGER", "TEAM_MEMBER", "VIEWER"]),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsInput = z.infer<typeof listProjectsSchema>;
export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;
export type UpdateProjectMemberRoleInput = z.infer<typeof updateProjectMemberRoleSchema>;
export type ProjectIdParams = z.infer<typeof projectIdParamsSchema>;
export type ProjectMemberParams = z.infer<typeof projectMemberParamsSchema>;