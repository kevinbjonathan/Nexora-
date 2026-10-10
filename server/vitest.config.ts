import { config } from "dotenv";
import { defineConfig } from "vitest/config";

config({ path: ".env.test" });

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      // Loaded before the app modules so the Prisma client targets the
      // isolated test database, never the development database.
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        "postgresql://postgres:postgres@127.0.0.1:5433/nexora_test?schema=public",
      CORS_ORIGIN: "http://localhost:5173",
      SESSION_SECRET: "nexora-test-only-session-secret-0123456789abcdef",
      LOG_LEVEL: "silent",
    },
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});