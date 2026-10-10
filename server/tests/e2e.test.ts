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

// Cross-cutting flow: project membership notifications, task assignment,
// comments, and the dashboard aggregates.
describe("collaboration flow", () => {
  it("notifies members, tracks comments, and reports dashboard aggregates", async () => {
    const owner = createAgent();
    await registerUser(owner, randomEmail("flow-owner"));
    const workspace = await createWorkspaceAs(owner, "Flow");
    const project = await createProjectAs(owner, workspace.id, "Full Flow");

    const member = createAgent();
    const memberUser = await registerUser(member, randomEmail("flow-member"));
    const invite = await owner
      .post(`/api/workspaces/${workspace.id}/invitations`)
      .send({ email: memberUser.email, role: "TEAM_MEMBER" });
    await member.post("/api/workspaces/invitations/accept").send({ token: invite.body.token });
    await loginUser(member, memberUser.email);

    // Owner adds member to the project team -> PROJECT_MEMBER_ADDED.
    const added = await owner
      .post(`/api/projects/${project.id}/members`)
      .send({ userId: memberUser.id });
    expect(added.status).toBe(201);

    // Owner assigns a task to member -> TASK_ASSIGNED.
    const task = await createTaskAs(owner, project.id, "Implement the live feed", {
      assigneeId: memberUser.id,
    });
    expect(task.assigneeId).toBe(memberUser.id);

    // Both parties comment; assignee (member) is notified when the owner adds one.
    await member.post(`/api/tasks/${task.id}/comments`).send({ body: "On it!" });
    await owner.post(`/api/tasks/${task.id}/comments`).send({ body: "Please ship this soon." });

    // Member unread notifications: added + assigned + commented.
    const unread = await member.get("/api/notifications/unread-count");
    expect(unread.body.count).toBe(3);

    const list = await member.get("/api/notifications?pageSize=10");
    expect(list.body.items).toHaveLength(3);
    const types = new Set(list.body.items.map((n: { type: string }) => n.type));
    expect(types).toEqual(
      new Set(["PROJECT_MEMBER_ADDED", "TASK_ASSIGNED", "TASK_COMMENTED"]),
    );

    // Mark everything read.
    const cleared = await member.post("/api/notifications/read-all");
    expect(cleared.body.count).toBe(0);

    // Comments are readable per task.
    const comments = await owner.get(`/api/tasks/${task.id}/comments`);
    expect(comments.body.items).toHaveLength(2);

    // Dashboard aggregates reflect the workspace.
    const dashboard = await owner.get(`/api/workspaces/${workspace.id}/dashboard`);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.summary.totalTasks).toBe(1);
    expect(dashboard.body.summary.projects).toBe(1);
    expect(dashboard.body.summary.members).toBe(2);
    expect(dashboard.body.summary.overdueTasks).toBe(0);
  });

  it("exposes the activity feed for the workspace", async () => {
    const owner = createAgent();
    await registerUser(owner, randomEmail("feed-owner"));
    const workspace = await createWorkspaceAs(owner, "Feed");
    const project = await createProjectAs(owner, workspace.id, "Feed Project");
    const task = await createTaskAs(owner, project.id, "Announce myself");

    const res = await owner.get(`/api/workspaces/${workspace.id}/activity`);
    expect(res.status).toBe(200);
    const actions = res.body.items.map((a: { action: string }) => a.action);
    expect(actions).toContain("workspace_created");
    expect(actions).toContain("project_created");
    expect(actions).toContain("task_created");
    expect(task.title).toBe("Announce myself");
  });
});