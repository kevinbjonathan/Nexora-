import { z } from "zod";
import { paginationSchema } from "../../utils/pagination.js";

export const uuidSchema = z.string().uuid("Invalid resource id.");

export const idParamsSchema = z.object({ id: uuidSchema });

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120).optional(),
  avatarUrl: z.string().url("Avatar URL must be a valid URL.").max(2048).nullable().optional(),
});

export const userSearchSchema = paginationSchema.extend({
  search: z.string().trim().max(120).optional().default(""),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UserSearchInput = z.infer<typeof userSearchSchema>;