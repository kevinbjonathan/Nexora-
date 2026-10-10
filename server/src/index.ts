import { startServer } from "./server.js";
import { logger } from "./utils/logger.js";

startServer().catch((error: unknown) => {
  logger.error(
    { errMessage: error instanceof Error ? error.message : String(error) },
    "Failed to start Nexora API",
  );
  process.exit(1);
});