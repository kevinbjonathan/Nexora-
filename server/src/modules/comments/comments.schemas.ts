import { z } from "zod";
import { uuidSchema } from "../users/users.schemas.js";

const commentBodySchema = z.string().trim().min(1, "Comment body is required.").max(5000);

export const commentIdParamsSchema = z.object({
  taskId: uuidSchema,
  commentId: uuidSchema,
});

export const taskParamsSchema = z.object({ taskId: uuidSchema });

export const createCommentSchema = z.object({ body: commentBodySchema });

export const updateCommentSchema = z.object({ body: commentBodySchema });

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CommentIdParams = z.infer<typeof commentIdParamsSchema>;