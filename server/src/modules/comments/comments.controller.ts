import type { Request, Response } from "express";
import { body, params, query } from "../../middleware/validate.js";
import type { TaskIdParams } from "../tasks/tasks.schemas.js";
import { createComment, deleteComment, listComments, updateComment } from "./comments.service.js";
import type { CommentIdParams, CreateCommentInput, UpdateCommentInput } from "./comments.schemas.js";

export const commentsController = {
  async create(req: Request, res: Response) {
    const { taskId } = params<TaskIdParams & { taskId: string }>(req);
    const comment = await createComment(req.auth!.user.id, taskId, body<CreateCommentInput>(req));
    res.status(201).json({ comment });
  },

  async list(req: Request, res: Response) {
    const { taskId } = params<TaskIdParams & { taskId: string }>(req);
    const input = query<{ page: number; pageSize: number }>(req);
    const result = await listComments(req.auth!.user.id, taskId, input.page, input.pageSize);
    res.json(result);
  },

  async update(req: Request, res: Response) {
    const { taskId, commentId } = params<CommentIdParams>(req);
    const comment = await updateComment(
      req.auth!.user.id,
      taskId,
      commentId,
      body<UpdateCommentInput>(req),
    );
    res.json({ comment });
  },

  async remove(req: Request, res: Response) {
    const { taskId, commentId } = params<CommentIdParams>(req);
    await deleteComment(req.auth!.user.id, taskId, commentId);
    res.status(204).send();
  },
};