import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate.js";
import { usersController } from "./users.controller.js";
import { idParamsSchema, updateProfileSchema, userSearchSchema } from "./users.schemas.js";

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.patch("/me", validateBody(updateProfileSchema), usersController.updateMe);
usersRouter.get("/", validateQuery(userSearchSchema), usersController.search);
usersRouter.get("/:id", validateParams(idParamsSchema), usersController.getUser);