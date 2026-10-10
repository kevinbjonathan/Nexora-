import type { Request, Response } from "express";
import { body, params, query } from "../../middleware/validate.js";
import { getUser, searchUsers, updateProfile } from "./users.service.js";
import type { UpdateProfileInput, UserSearchInput } from "./users.schemas.js";

export const usersController = {
  async updateMe(req: Request, res: Response) {
    const user = await updateProfile(req.auth!.user.id, body<UpdateProfileInput>(req));
    res.json({ user });
  },

  async getUser(req: Request, res: Response) {
    const { id } = params<{ id: string }>(req);
    const user = await getUser(id);
    res.json({ user });
  },

  async search(req: Request, res: Response) {
    const input = query<UserSearchInput>(req);
    const result = await searchUsers(input.search, input.page, input.pageSize);
    res.json(result);
  },
};