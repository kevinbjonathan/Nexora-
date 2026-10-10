import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";
import { buildPaginatedResult, toSkipTake } from "../../utils/pagination.js";
import { publicUser } from "./user.serializer.js";
import type { UpdateProfileInput } from "./users.schemas.js";

const publicSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  createdAt: true,
} as const;

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
    },
  });
  return publicUser(user);
}

export async function getUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw ApiError.notFound("User not found.");
  }
  return publicUser(user);
}

export async function searchUsers(search: string, page: number, pageSize: number) {
  const where =
    search.length > 0
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : undefined;

  const { skip, take } = toSkipTake(page, pageSize);
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: publicSelect,
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);

  return buildPaginatedResult(items, total, page, pageSize);
}