import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate.js";
import { paginationSchema } from "../../utils/pagination.js";
import { commentsController } from "./comments.controller.js";
import { commentIdParamsSchema, createCommentSchema, taskParamsSchema, updateCommentSchema } from "./comments.schemas.js";

export const commentsRouter = Router({ mergeParams: true });

commentsRouter.use(authenticate);

commentsRouter.get("/", validateParams(taskParamsSchema), validateQuery(paginationSchema), commentsController.list);
commentsRouter.post("/", validateParams(taskParamsSchema), validateBody(createCommentSchema), commentsController.create);
commentsRouter.patch(
  "/:commentId",
  validateParams(commentIdParamsSchema),
  validateBody(updateCommentSchema),
  commentsController.update,
);
commentsRouter.delete(
  "/:commentId",
  validateParams(commentIdParamsSchema),
  commentsController.remove,
);