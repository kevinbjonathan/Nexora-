import { describe, it, expect } from "vitest";
import {
  createAgent,
  createProjectAs,
  createTaskAs,
  createWorkspaceAs,
  loginUser,
  randomEmail,
  registerUser,
} from "./helpers.js";

async function setupOwner() {
  const agent = createAgent();
  await registerUser(agent, randomEmail("progress-owner"));
  const workspace = await createWorkspaceAs(agent, "Progress HQ");
  return { agent, workspace };
}

async function progressOf(agent: ReturnType<typeof createAgent>, projectId: string) {
  const res = await agent.get(`/api/projects/${projectId}`);
  expect(res.status).toBe(200);
  return res.body.project.progress as number;
}

describe("project progress", () => {
  it("reports 0 progress for a project with no tasks", async () => {
    const { agent, workspace } = await setupOwner();
    const project = await createProjectAs(agent, workspace.id, "Empty");
    expect(project.progress).toBe(0);

    const res = await agent.get(`/api/projects/${project.id}`);
    expect(res.body.project.progress).toBe(0);
    expect(res.body.project.tasksCount).toBe(0);
  });

  it("reports 100 progress when all tasks are DONE", async () => {
    const { agent, workspace } = await setupOwner();
    const project = await createProjectAs(agent, workspace.id, "All Done");
    await createTaskAs(agent, project.id, "First", { status: "DONE" });
    await createTaskAs(agent, project.id, "Second", { status: "DONE" });

    const res = await agent.get(`/api/projects/${project.id}`);
    expect(res.body.project.progress).toBe(100);
    expect(res.body.project.tasksCount).toBe(2);
  });

  it("reports 0 progress when no tasks are DONE", async () => {
    const { agent, workspace } = await setupOwner();
    const project = await createProjectAs(agent, workspace.id, "Nothing Done");
    await createTaskAs(agent, project.id, "Backlog");
    await createTaskAs(agent, project.id, "In flight", { status: "IN_PROGRESS" });

    expect(await progressOf(agent, project.id)).toBe(0);
  });

  it("computes progress from a mixture of completed and open tasks", async () => {
    const { agent, workspace } = await setupOwner();
    const project = await createProjectAs(agent, workspace.id, "Half Way");
    await createTaskAs(agent, project.id, "Shipped", { status: "DONE" });
    await createTaskAs(agent, project.id, "WIP", { status: "IN_PROGRESS" });

    expect(await progressOf(agent, project.id)).toBe(50);
  });

  it("excludes archived tasks from the progress calculation", async () => {
    const { agent, workspace } = await setupOwner();
    const project = await createProjectAs(agent, workspace.id, "Archive Aware");
    await createTaskAs(agent, project.id, "Shipped", { status: "DONE" });
    const stale = await createTaskAs(agent, project.id, "Stale TODO");

    // Without the exclusion this would be 50 (1 of 2); with it, 100 (1 of 1 active).
    const archived = await agent.post(`/api/tasks/${stale.id}/archive`);
    expect(archived.status).toBe(200);
    expect(await progressOf(agent, project.id)).toBe(100);
  });

  it("reflects task status changes immediately", async () => {
    const { agent, workspace } = await setupOwner();
    const project = await createProjectAs(agent, workspace.id, "Live");
    const task = await createTaskAs(agent, project.id, "Flippable");
    expect(await progressOf(agent, project.id)).toBe(0);

    const done = await agent.patch(`/api/tasks/${task.id}`).send({ status: "DONE", version: 1 });
    expect(done.status).toBe(200);
    expect(await progressOf(agent, project.id)).toBe(100);

    const reopened = await agent
      .patch(`/api/tasks/${task.id}`)
      .send({ status: "IN_PROGRESS", version: 2 });
    expect(reopened.status).toBe(200);
    expect(await progressOf(agent, project.id)).toBe(0);
  });

  it("keeps per-project progress distinct across multiple projects", async () => {
    const { agent, workspace } = await setupOwner();
    const p1 = await createProjectAs(agent, workspace.id, "P1");
    const p2 = await createProjectAs(agent, workspace.id, "P2");

    await createTaskAs(agent, p1.id, "p1-done", { status: "DONE" });
    await createTaskAs(agent, p1.id, "p1-open");
    await createTaskAs(agent, p2.id, "p2-done-a", { status: "DONE" });
    await createTaskAs(agent, p2.id, "p2-done-b", { status: "DONE" });
    await createTaskAs(agent, p2.id, "p2-open");

    expect(await progressOf(agent, p1.id)).toBe(50);
    expect(await progressOf(agent, p2.id)).toBe(67);

    const list = await agent.get(`/api/workspaces/${workspace.id}/projects`);
    expect(list.status).toBe(200);
    const byName = Object.fromEntries(
      list.body.items.map((p: { name: string; progress: number }) => [p.name, p.progress]),
    );
    expect(byName).toEqual({ P1: 50, P2: 67 });
  });

  it("ignores client-submitted progress values", async () => {
    const { agent, workspace } = await setupOwner();

    const created = await agent
      .post(`/api/workspaces/${workspace.id}/projects`)
      .send({ name: "Ignoreme", progress: 88 });
    expect(created.status).toBe(201);
    expect(created.body.project.progress).toBe(0);

    await createTaskAs(agent, created.body.project.id, "Done", { status: "DONE" });
    const updated = await agent
      .patch(`/api/projects/${created.body.project.id}`)
      .send({ description: "updated", progress: 77 });
    expect(updated.status).toBe(200);
    expect(updated.body.project.progress).toBe(100);
  });

  it("enforces authorization when reading progress", async () => {
    const { agent, workspace } = await setupOwner();
    const project = await createProjectAs(agent, workspace.id, "Secret");

    const outsider = createAgent();
    await registerUser(outsider, randomEmail("progress-outsider"));
    const denied = await outsider.get(`/api/projects/${project.id}`);
    expect(denied.status).toBe(404);

    const other = createAgent();
    await registerUser(other, randomEmail("progress-other"));
    const otherWorkspace = await createWorkspaceAs(other, "Elsewhere");
    await createProjectAs(other, otherWorkspace.id, "Theirs");
    const deniedToo = await other.get(`/api/projects/${project.id}`);
    expect(deniedToo.status).toBe(404);
  });

  it("allows every workspace member (including a VIEWER) to read progress", async () => {
    const { agent, workspace } = await setupOwner();
    const project = await createProjectAs(agent, workspace.id, "Visible");
    await createTaskAs(agent, project.id, "Shipped", { status: "DONE" });

    const member = createAgent();
    const { email } = await registerUser(member, randomEmail("progress-viewer"));
    const invite = await agent
      .post(`/api/workspaces/${workspace.id}/invitations`)
      .send({ email, role: "VIEWER" });
    expect(invite.status).toBe(201);
    await member.post("/api/workspaces/invitations/accept").send({ token: invite.body.token });
    await loginUser(member, email);

    expect(await progressOf(member, project.id)).toBe(100);
  });
});