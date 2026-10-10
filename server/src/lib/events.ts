import { AsyncLocalStorage } from "node:async_hooks";
import { prisma } from "./prisma.js";
import { logger } from "../utils/logger.js";
import type { PrismaTransactionClient } from "./transaction.js";

type PostCommitCallback = () => void;

const storage = new AsyncLocalStorage<PostCommitCallback[]>();

/**
 * Registers a side effect (e.g. a Socket.IO broadcast) to run only after the
 * current database transaction commits. When no transaction is active the
 * callback runs immediately.
 */
export function queueAfterCommit(callback: PostCommitCallback): void {
  const queue = storage.getStore();
  if (queue) {
    queue.push(callback);
  } else {
    callback();
  }
}

/**
 * Runs `fn` inside a single database transaction. Any side effects registered
 * via `queueAfterCommit` are flushed only once the transaction has committed,
 * so clients never observe events for data that was rolled back.
 */
export async function runInTransaction<T>(
  fn: (tx: PrismaTransactionClient) => Promise<T>,
): Promise<T> {
  const queue: PostCommitCallback[] = [];

  const result = await storage.run(queue, () =>
    prisma.$transaction((tx) => fn(tx)),
  );

  for (const callback of queue) {
    try {
      callback();
    } catch (error) {
      logger.error(
        { errMessage: error instanceof Error ? error.message : "unknown" },
        "Post-commit callback failed",
      );
    }
  }

  return result;
}
