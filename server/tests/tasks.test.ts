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
  const user = await registerUser(agent, randomEmail("task-owner"));
  const workspace = await createWorkspaceAs(agent, "Task HQ");
  const project = await createProjectAs(agent, workspace.id, "Ship Nexora");
  return { agent, user, workspace, project };
}

describe("tasks", () => {
  it("creates a task with version 1", async () => {
    const { agent, project } = await setupOwner();
    const task = await createTaskAs(agent, project.id, "Write README", {
      priority: "HIGH",
      status: "IN_PROGRESS",
    });

    expect(task).toMatchObject({
      title: "Write README",
      priority: "HIGH",
      status: "IN_PROGRESS",
      version: 1,
    });
    expect(task.reporterId).toBeTruthy();
  });

  it("fetches a task with project context and comments", async () => {
    const { agent, project } = await setupOwner();
    const task = await createTaskAs(agent, project.id, "Scope the API");

    const res = await agent.get(`/api/tasks/${task.id}`);
    expect(res.status).toBe(200);
    expect(res.body.task.project.name).toBe("Ship Nexora");
    expect(res.body.comments).toEqual([]);
  });

  it("applies optimistic concurrency: stale updates return 409", async () => {
    const { agent, project } = await setupOwner();
    const task = await createTaskAs(agent, project.id, "Lock the version");

    const first = await agent
      .patch(`/api/tasks/${task.id}`)
      .send({ title: "Updated title", version: 1 });
    expect(first.status).toBe(200);
    expect(first.body.task.version).toBe(2);

    // A client that based its edit on version 1 is now out of date.
    const stale = await agent
      .patch(`/api/tasks/${task.id}`)
      .send({ title: "Outdated edit", version: 1 });

    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe("VERSION_CONFLICT");
    expect(stale.body.error.details.currentVersion).toBe(2);
  });

  it("marks completedAt when a task moves to DONE and clears it afterwards", async () => {
    const { agent, project } = await setupOwner();
    const task = await createTaskAs(agent, project.id, "Finish docs");

    const done = await agent
      .patch(`/api/tasks/${task.id}`)
      .send({ status: "DONE", version: 1 });
    expect(done.body.task.completedAt).toBeTruthy();

    const reopened = await agent
      .patch(`/api/tasks/${task.id}`)
      .send({ status: "TODO", version: 2 });
    expect(reopened.body.task.completedAt).toBeNull();
  });

  it("reorders tasks within a project", async () => {
    const { agent, project } = await setupOwner();
    const a = await createTaskAs(agent, project.id, "Task A", { position: 0 });
    const b = await createTaskAs(agent, project.id, "Task B", { position: 1 });

    const res = await agent.post(`/api/projects/${project.id}/tasks/reorder`).send({
      orders: [
        { id: b.id, position: 0, version: b.version },
        { id: a.id, position: 1, version: a.version },
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body.tasks[0].id).toBe(b.id);
  });

  it("filters tasks by status", async () => {
    const { agent, project } = await setupOwner();
    await createTaskAs(agent, project.id, "To do later");
    await createTaskAs(agent, project.id, "Doing now", { status: "IN_PROGRESS" });

    const res = await agent.get(`/api/projects/${project.id}/tasks?status=IN_PROGRESS`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].title).toBe("Doing now");
  });

  it("rejects assignment to a user outside the workspace", async () => {
    const { agent, project } = await setupOwner();
    const outsider = createAgent();
    const { id: outsiderId } = await registerUser(outsider, randomEmail("task-outsider"));

    const res = await agent
      .post(`/api/projects/${project.id}/tasks`)
      .send({ title: "Nope", assigneeId: outsiderId });

    expect(res.status).toBe(404);
  });

  it("prevents a VIEWER from archiving tasks but allows an ADMIN", async () => {
    const { agent, workspace, project } = await setupOwner();
    const member = createAgent();
    const { email } = await registerUser(member, randomEmail("task-viewer"));
    const invite = await agent
      .post(`/api/workspaces/${workspace.id}/invitations`)
      .send({ email, role: "VIEWER" });
    await member.post("/api/workspaces/invitations/accept").send({ token: invite.body.token });
    await loginUser(member, email);

    const task = await createTaskAs(agent, project.id, "Sensitive task");

    const denied = await member.post(`/api/tasks/${task.id}/archive`);
    expect(denied.status).toBe(403);

    const archived = await agent.post(`/api/tasks/${task.id}/archive`);
    expect(archived.status).toBe(200);
    expect(archived.body.task.archivedAt).toBeTruthy();

    // Archived tasks are hidden from the default list.
    const list = await agent.get(`/api/projects/${project.id}/tasks`);
    expect(list.body.items).toHaveLength(0);
  });
});