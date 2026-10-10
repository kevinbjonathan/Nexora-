import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate.js";
import { tasksController } from "./tasks.controller.js";
import {
  createTaskSchema,
  listTasksSchema,
  projectParamsSchema,
  reorderTasksSchema,
  taskIdParamsSchema,
  updateTaskSchema,
} from "./tasks.schemas.js";

export const tasksRouter = Router({ mergeParams: true });

tasksRouter.use(authenticate);

tasksRouter.get("/", validateParams(projectParamsSchema), validateQuery(listTasksSchema), tasksController.list);
tasksRouter.post("/", validateParams(projectParamsSchema), validateBody(createTaskSchema), tasksController.create);
tasksRouter.post("/reorder", validateParams(projectParamsSchema), validateBody(reorderTasksSchema), tasksController.reorder);
tasksRouter.get("/:taskId", validateParams(taskIdParamsSchema), tasksController.get);
tasksRouter.patch(
  "/:taskId",
  validateParams(taskIdParamsSchema),
  validateBody(updateTaskSchema),
  tasksController.update,
);
tasksRouter.post("/:taskId/archive", validateParams(taskIdParamsSchema), tasksController.archive);