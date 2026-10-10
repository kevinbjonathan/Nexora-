import type { Prisma } from "../generated/prisma/client.js";

// The client passed to `prisma.$transaction(async (tx) => ...)`.
export type PrismaTransactionClient = Prisma.TransactionClient;
