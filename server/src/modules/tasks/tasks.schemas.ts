import { z } from "zod";
import { paginationSchema } from "../../utils/pagination.js";
import { uuidSchema } from "../users/users.schemas.js";

const titleSchema = z.string().trim().min(1, "Title is required.").max(255);
const versionSchema = z.number().int().min(1, "A positive version is required.");

export const taskIdParamsSchema = z.object({ taskId: uuidSchema });

export const projectParamsSchema = z.object({ projectId: uuidSchema });

export const createTaskSchema = z.object({
  title: titleSchema,
  description: z.string().trim().max(5000).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: uuidSchema.nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  position: z.number().optional(),
});

export const updateTaskSchema = z
  .object({
    title: titleSchema.optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "DONE"]).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    assigneeId: uuidSchema.nullable().optional(),
    dueDate: z.coerce.date().nullable().optional(),
    position: z.number().optional(),
    version: versionSchema,
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.description !== undefined ||
      value.status !== undefined ||
      value.priority !== undefined ||
      value.assigneeId !== undefined ||
      value.dueDate !== undefined ||
      value.position !== undefined,
    { message: "At least one field must be provided." },
  );

export const listTasksSchema = paginationSchema.extend({
  status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: uuidSchema.optional(),
  includeArchived: z.coerce.boolean().optional().default(false),
});

export const reorderTasksSchema = z.object({
  orders: z
    .array(
      z.object({
        id: uuidSchema,
        position: z.number().min(0),
        version: versionSchema,
      }),
    )
    .min(1, "At least one task order is required.")
    .max(500),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksInput = z.infer<typeof listTasksSchema>;
export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>;
export type TaskIdParams = z.infer<typeof taskIdParamsSchema>;