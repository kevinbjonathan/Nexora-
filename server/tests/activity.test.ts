import { describe, it, expect, afterEach } from "vitest";
import { createAgent, createProjectAs, createTaskAs, createWorkspaceAs, randomEmail, registerUser } from "./helpers.js";
import { setIo } from "../src/realtime/emitter.js";
import { serializeActivity } from "../src/modules/activity/activity.service.js";

const OWNER_NAME = "Radar Owner";

async function setup() {
  const agent = createAgent();
  await registerUser(agent, randomEmail("radar"), OWNER_NAME);
  const workspace = await createWorkspaceAs(agent, "Radar HQ");
  const project = await createProjectAs(agent, workspace.id, "Radar Project");
  return { agent, workspace, project };
}

interface CapturedEvent {
  room: string;
  event: string;
  payload: unknown;
}

function captureEmits(): CapturedEvent[] {
  const captured: CapturedEvent[] = [];
  const fakeIo = {
    to: (room: string) => ({
      emit: (event: string, payload: unknown) => {
        captured.push({ room, event, payload });
      },
    }),
  };
  setIo(fakeIo as never);
  return captured;
}

afterEach(() => setIo(null as never));

describe("activity actor serialization", () => {
  it("returns the real actor name for every event type (REST)", async () => {
    const { agent, workspace, project } = await setup();
    const task = await createTaskAs(agent, project.id, "Trace me");
    await agent.patch(`/api/tasks/${task.id}`).send({ status: "IN_PROGRESS", version: task.version });

    const res = await agent.get(`/api/workspaces/${workspace.id}/activity`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(3); // project + task create + task update

    for (const item of res.body.items) {
      expect(item.actor).toBeTruthy();
      expect(item.actor.name).toBe(OWNER_NAME);
      expect(item.actor.email).toBeUndefined();
      expect(item.actor.passwordHash).toBeUndefined();
    }
  });

  it("does not leak sensitive fields on activity records", async () => {
    const { agent, workspace } = await setup();
    const res = await agent.get(`/api/workspaces/${workspace.id}/activity`);
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toMatch(/password/i);
    expect(serialized).not.toMatch(/session/i);
  });

  it("broadcasts activity:created with the actor identity (realtime path)", async () => {
    const captured = captureEmits();
    const { agent, project } = await setup();
    await createTaskAs(agent, project.id, "Live event");

    const activityEvents = captured.filter((e) => e.event === "activity:created");
    expect(activityEvents.length).toBeGreaterThan(0);

    const payload = activityEvents[0].payload as { actor?: { name?: string } };
    expect(payload.actor).toBeTruthy();
    expect(payload.actor?.name).toBe(OWNER_NAME);
  });

  it("serializes a missing actor as null without throwing", () => {
    const base = {
      id: "a1",
      workspaceId: "w1",
      projectId: null,
      taskId: null,
      actorId: null,
      action: "workspace_created",
      entityType: "WORKSPACE",
      entityId: "e1",
      summary: "Workspace created",
      metadata: null,
      createdAt: new Date(),
    };
    const out = serializeActivity(base as never, { actor: null, project: null, task: null });
    expect(out.actor).toBeNull();
    expect(out).not.toHaveProperty("passwordHash");
  });
});
