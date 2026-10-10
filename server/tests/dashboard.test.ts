import { describe, it, expect } from "vitest";
import { createAgent, createWorkspaceAs, randomEmail, registerUser } from "./helpers.js";

// Dates are computed in the same local-timezone the server uses for its
// calendar-day boundaries, so the assertions are stable regardless of clock.
function dayAt(daysFromToday: number, hour = 12): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString();
}

async function setup() {
  const agent = createAgent();
  await registerUser(agent, randomEmail("dash"), "Dash Owner");
  const workspace = await createWorkspaceAs(agent, "Dash HQ");
  return { agent, workspace };
}

async function createProject(
  agent: ReturnType<typeof createAgent>,
  workspaceId: string,
  opts: { dueDate?: string; status?: string } = {},
) {
  const res = await agent
    .post(`/api/workspaces/${workspaceId}/projects`)
    .send({ name: `P-${Math.random().toString(36).slice(2, 8)}`, status: opts.status ?? "ACTIVE", dueDate: opts.dueDate });
  expect(res.status).toBe(201);
  return res.body.project;
}

async function createTask(
  agent: ReturnType<typeof createAgent>,
  projectId: string,
  opts: { dueDate?: string; status?: string } = {},
) {
  const res = await agent
    .post(`/api/projects/${projectId}/tasks`)
    .send({ title: `T-${Math.random().toString(36).slice(2, 8)}`, status: opts.status ?? "TODO", dueDate: opts.dueDate });
  expect(res.status).toBe(201);
  return res.body.task;
}

async function summary(agent: ReturnType<typeof createAgent>, workspaceId: string) {
  const res = await agent.get(`/api/workspaces/${workspaceId}/dashboard`);
  expect(res.status).toBe(200);
  return res.body.summary as {
    overdueTasks: number;
    dueSoonTasks: number;
    dueSoonProjects: number;
  };
}

describe("dashboard due-soon KPI", () => {
  it("counts a project due tomorrow as due soon", async () => {
    const { agent, workspace } = await setup();
    await createProject(agent, workspace.id, { dueDate: dayAt(1) });

    const s = await summary(agent, workspace.id);
    expect(s.dueSoonProjects).toBe(1);
    expect(s.dueSoonTasks).toBe(0);
  });

  it("keeps task and project deadlines semantically distinct", async () => {
    const { agent, workspace } = await setup();
    const project = await createProject(agent, workspace.id, { dueDate: dayAt(1) });
    await createTask(agent, project.id, { dueDate: dayAt(1) });

    const s = await summary(agent, workspace.id);
    expect(s.dueSoonProjects).toBe(1);
    expect(s.dueSoonTasks).toBe(1);
  });

  it("counts an item due today as due soon, not overdue", async () => {
    const { agent, workspace } = await setup();
    const project = await createProject(agent, workspace.id, { dueDate: dayAt(0) });
    await createTask(agent, project.id, { dueDate: dayAt(0) });

    const s = await summary(agent, workspace.id);
    expect(s.dueSoonTasks).toBe(1);
    expect(s.dueSoonProjects).toBe(1);
    expect(s.overdueTasks).toBe(0);
  });

  it("excludes overdue items from the due-soon count", async () => {
    const { agent, workspace } = await setup();
    const project = await createProject(agent, workspace.id, { dueDate: dayAt(-1) });
    await createTask(agent, project.id, { dueDate: dayAt(-1) });

    const s = await summary(agent, workspace.id);
    expect(s.overdueTasks).toBe(1);
    expect(s.dueSoonTasks).toBe(0);
    expect(s.dueSoonProjects).toBe(0);
  });

  it("excludes items beyond seven days", async () => {
    const { agent, workspace } = await setup();
    const project = await createProject(agent, workspace.id, { dueDate: dayAt(10) });
    await createTask(agent, project.id, { dueDate: dayAt(10) });

    const s = await summary(agent, workspace.id);
    expect(s.dueSoonTasks).toBe(0);
    expect(s.dueSoonProjects).toBe(0);
  });

  it("does not count DONE tasks as due soon", async () => {
    const { agent, workspace } = await setup();
    const project = await createProject(agent, workspace.id, {});
    await createTask(agent, project.id, { dueDate: dayAt(1), status: "DONE" });

    const s = await summary(agent, workspace.id);
    expect(s.dueSoonTasks).toBe(0);
  });

  it("does not count COMPLETED projects as due soon", async () => {
    const { agent, workspace } = await setup();
    await createProject(agent, workspace.id, { dueDate: dayAt(1), status: "COMPLETED" });

    const s = await summary(agent, workspace.id);
    expect(s.dueSoonProjects).toBe(0);
  });
});
