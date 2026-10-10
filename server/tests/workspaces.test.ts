import { describe, it, expect } from "vitest";
import {
  createAgent,
  createWorkspaceAs,
  loginUser,
  randomEmail,
  registerUser,
} from "./helpers.js";

describe("workspaces", () => {
  it("creates a workspace and makes the creator an ADMIN", async () => {
    const agent = createAgent();
    await registerUser(agent, randomEmail("ws-admin"));

    const res = await agent.post("/api/workspaces").send({ name: "Nexora Dev" });

    expect(res.status).toBe(201);
    expect(res.body.workspace).toMatchObject({
      name: "Nexora Dev",
      role: "ADMIN",
    });
    expect(res.body.workspace.slug).toBe("nexora-dev");
  });

  it("lists only the workspaces I belong to", async () => {
    const agent = createAgent();
    await registerUser(agent, randomEmail("ws-list"));
    await createWorkspaceAs(agent, "Alpha");
    await createWorkspaceAs(agent, "Beta");

    const res = await agent.get("/api/workspaces");
    expect(res.status).toBe(200);
    expect(res.body.items.map((w: { name: string }) => w.name).sort()).toEqual([
      "Alpha",
      "Beta",
    ]);
  });

  it("updates workspace details", async () => {
    const agent = createAgent();
    await registerUser(agent, randomEmail("ws-update"));
    const workspace = await createWorkspaceAs(agent, "Rename Me");

    const res = await agent
      .patch(`/api/workspaces/${workspace.id}`)
      .send({ description: "Renamed!" });

    expect(res.status).toBe(200);
    expect(res.body.workspace.description).toBe("Renamed!");
  });

  it("prevents non-members from reading a workspace (404, no leak)", async () => {
    const owner = createAgent();
    await registerUser(owner, randomEmail("ws-owner"));
    const workspace = await createWorkspaceAs(owner, "Private");

    const outsider = createAgent();
    const outsiderUser = await registerUser(outsider, randomEmail("ws-outsider"));

    const res = await outsider.get(`/api/workspaces/${workspace.id}`);
    expect(res.status).toBe(404);

    await loginUser(outsider, outsiderUser.email);
    const members = await outsider.get(`/api/workspaces/${workspace.id}/members`);
    expect(members.status).toBe(404);
  });

  it("lists members with their profile details", async () => {
    const owner = createAgent();
    await registerUser(owner, randomEmail("ws-members"));
    const workspace = await createWorkspaceAs(owner, "Team");

    const res = await owner.get(`/api/workspaces/${workspace.id}/members`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ role: "ADMIN" });
    expect(res.body.items[0].user.email).toBeTruthy();
  });

  it("invites and accepts a member via invitation token", async () => {
    const owner = createAgent();
    await registerUser(owner, randomEmail("ws-invite-owner"));
    const workspace = await createWorkspaceAs(owner, "Invite Town");

    const { email } = await registerUser(createAgent(), randomEmail("ws-invite-join"));

    const invite = await owner
      .post(`/api/workspaces/${workspace.id}/invitations`)
      .send({ email, role: "TEAM_MEMBER" });
    expect(invite.status).toBe(201);

    const joiner = createAgent();
    await loginUser(joiner, email);

    const accept = await joiner.post("/api/workspaces/invitations/accept").send({
      token: invite.body.token,
    });
    expect(accept.status).toBe(201);
    expect(accept.body.workspace).toMatchObject({ name: "Invite Town", role: "TEAM_MEMBER" });

    const members = await owner.get(`/api/workspaces/${workspace.id}/members`);
    expect(members.body.items).toHaveLength(2);
  });

  it("protects the last admin from removal", async () => {
    const owner = createAgent();
    const ownerUser = await registerUser(owner, randomEmail("ws-lastadmin"));
    const workspace = await createWorkspaceAs(owner, "Last Admin");

    const res = await owner.delete(`/api/workspaces/${workspace.id}/members/${ownerUser.id}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("enforces role permissions for member management", async () => {
    const owner = createAgent();
    const ownerUser = await registerUser(owner, randomEmail("ws-role-owner"));
    const workspace = await createWorkspaceAs(owner, "Roles");

    const member = createAgent();
    const { email } = await registerUser(member, randomEmail("ws-role-member"));
    const invite = await owner
      .post(`/api/workspaces/${workspace.id}/invitations`)
      .send({ email, role: "TEAM_MEMBER" });
    await member.post("/api/workspaces/invitations/accept").send({ token: invite.body.token });

    // A TEAM_MEMBER cannot change the admin's role.
    const res = await member
      .patch(`/api/workspaces/${workspace.id}/members/${ownerUser.id}`)
      .send({ role: "VIEWER" });
    expect(res.status).toBe(403);

    // The admin can promote the member.
    const memberId = (await owner.get(`/api/workspaces/${workspace.id}/members`)).body.items[1].user
      .id;
    const promoted = await owner
      .patch(`/api/workspaces/${workspace.id}/members/${memberId}`)
      .send({ role: "PROJECT_MANAGER" });
    expect(promoted.status).toBe(200);
  });
});

describe("workspace search", () => {
  async function setup() {
    const agent = createAgent();
    await registerUser(agent, randomEmail("ws-search"));
    return agent;
  }

  it("matches workspaces by name", async () => {
    const agent = await setup();
    await createWorkspaceAs(agent, "Alpha Squad");

    const res = await agent.get("/api/workspaces?search=Alpha");
    expect(res.status).toBe(200);
    expect(res.body.items.map((w: { name: string }) => w.name)).toEqual(["Alpha Squad"]);
  });

  it("matches case-insensitively", async () => {
    const agent = await setup();
    await createWorkspaceAs(agent, "Beta Force");

    const res = await agent.get("/api/workspaces?search=beta");
    expect(res.body.items.map((w: { name: string }) => w.name)).toEqual(["Beta Force"]);
  });

  it("searches the description field as well", async () => {
    const agent = await setup();
    await agent
      .post("/api/workspaces")
      .send({ name: "Gamma Unit", description: "operates the blue squad" });

    const byDescription = await agent.get("/api/workspaces?search=blue");
    expect(byDescription.body.items.map((w: { name: string }) => w.name)).toEqual(["Gamma Unit"]);

    const noMatch = await agent.get("/api/workspaces?search=purple");
    expect(noMatch.body.items).toEqual([]);
    expect(noMatch.body.pagination.total).toBe(0);
  });

  it("returns no results when nothing matches", async () => {
    const agent = await setup();
    await createWorkspaceAs(agent, "Delta Room");

    const res = await agent.get("/api/workspaces?search=zzzz");
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  it("combines search with pagination", async () => {
    const agent = await setup();
    await createWorkspaceAs(agent, "Zeta One");
    await createWorkspaceAs(agent, "Zeta Two");

    const res = await agent.get("/api/workspaces?search=zeta&pageSize=1");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.pagination).toMatchObject({ total: 2, totalPages: 2, hasNextPage: true });
  });

  it("never reveals another user's workspace through search", async () => {
    const owner = createAgent();
    await registerUser(owner, randomEmail("ws-search-owner"));
    await createWorkspaceAs(owner, "Hidden Hidden Vault");

    const stranger = await setup();
    const res = await stranger.get("/api/workspaces?search=Hidden");
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  it("lists everything when no search parameter is provided", async () => {
    const agent = await setup();
    await createWorkspaceAs(agent, "Epsilon");
    await createWorkspaceAs(agent, "Eta");

    const res = await agent.get("/api/workspaces");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
  });

  it("rejects invalid search query parameters consistently", async () => {
    const agent = await setup();

    const tooLong = await agent.get(`/api/workspaces?search=${"x".repeat(121)}`);
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.error.code).toBe("VALIDATION_ERROR");
  });
});