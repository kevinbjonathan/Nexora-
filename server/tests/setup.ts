import { beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";

// Tables in dependency order; TRUNCATE ... CASCADE resets identity counts too.
const TEST_TABLES = [
  "password_reset_tokens",
  "sessions",
  "notifications",
  "activity_logs",
  "comments",
  "tasks",
  "project_members",
  "projects",
  "workspace_invitations",
  "workspace_members",
  "workspaces",
  "users",
];

beforeAll(async () => {
  const names = TEST_TABLES.map((table) => `"${table}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} CASCADE`);
});

afterAll(async () => {
  await prisma.$disconnect();
});