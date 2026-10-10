import { z } from "zod";
import { paginationSchema } from "../../utils/pagination.js";
import { uuidSchema } from "../users/users.schemas.js";

export const listActivitySchema = paginationSchema.extend({
  projectId: uuidSchema.optional(),
  taskId: uuidSchema.optional(),
  action: z.string().trim().max(120).optional(),
});

export type ListActivityInput = z.infer<typeof listActivitySchema>;