import request from "supertest";
import { createApp } from "../src/app.js";

export const TEST_ORIGIN = "http://localhost:5173";
export const TEST_PASSWORD = "SecurePass123!";

// An agent keeps the session cookie and always sends an allow-listed Origin
// (the frontend would, and the CSRF origin guard requires it for
// cookie-authenticated state-changing requests).
export function createAgent() {
  const app = createApp();
  return request.agent(app).set("Origin", TEST_ORIGIN);
}

export async function registerUser(
  agent: ReturnType<typeof createAgent>,
  email: string,
  name = "Test User",
  password = TEST_PASSWORD,
) {
  const res = await agent.post("/api/auth/register").send({ name, email, password });
  if (res.status !== 201) {
    throw new Error(`register failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.user;
}

export async function loginUser(
  agent: ReturnType<typeof createAgent>,
  email: string,
  password = TEST_PASSWORD,
) {
  const res = await agent.post("/api/auth/login").send({ email, password });
  if (res.status !== 200) {
    throw new Error(`login failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.user;
}

export async function createWorkspaceAs(agent: ReturnType<typeof createAgent>, name: string) {
  const res = await agent.post("/api/workspaces").send({ name });
  if (res.status !== 201) {
    throw new Error(`create workspace failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.workspace;
}

export async function createProjectAs(
  agent: ReturnType<typeof createAgent>,
  workspaceId: string,
  name: string,
) {
  const res = await agent
    .post(`/api/workspaces/${workspaceId}/projects`)
    .send({ name, status: "ACTIVE", priority: "HIGH" });
  if (res.status !== 201) {
    throw new Error(`create project failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.project;
}

export async function createTaskAs(
  agent: ReturnType<typeof createAgent>,
  projectId: string,
  title: string,
  overrides: Record<string, unknown> = {},
) {
  const res = await agent.post(`/api/projects/${projectId}/tasks`).send({ title, ...overrides });
  if (res.status !== 201) {
    throw new Error(`create task failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.task;
}

export function randomEmail(prefix = "user") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}