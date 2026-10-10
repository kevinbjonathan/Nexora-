import request from "supertest";
import { describe, it, expect } from "vitest";
import { createApp } from "../src/app.js";
import { createAgent, randomEmail, TEST_PASSWORD } from "./helpers.js";

describe("auth", () => {
  it("registers a new user and returns a session cookie", async () => {
    const agent = createAgent();
    const email = randomEmail("register");

    const res = await agent.post("/api/auth/register").send({
      name: "Alice",
      email,
      password: TEST_PASSWORD,
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: "Alice", email });
    expect(res.body.user).not.toHaveProperty("passwordHash");
    expect(res.headers["set-cookie"]?.[0] ?? "").toContain("nexora_session=");
  });

  it("rejects a duplicate registration with 409", async () => {
    const email = randomEmail("dup");
    const agent = createAgent();
    await agent.post("/api/auth/register").send({ name: "A", email, password: TEST_PASSWORD });

    const res = await agent
      .post("/api/auth/register")
      .send({ name: "B", email, password: TEST_PASSWORD });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("rejects a weak password with a validation error", async () => {
    const agent = createAgent();
    const res = await agent.post("/api/auth/register").send({
      name: "C",
      email: randomEmail("weak"),
      password: "short",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it("rejects bad credentials with 401", async () => {
    const agent = createAgent();
    const res = await agent.post("/api/auth/login").send({
      email: randomEmail("nope"),
      password: "wrong-wrong-wrong",
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("signs in and exposes the current user", async () => {
    const agent = createAgent();
    const email = randomEmail("login");
    await agent.post("/api/auth/register").send({ name: "D", email, password: TEST_PASSWORD });

    const meBefore = await agent.get("/api/auth/me");
    expect(meBefore.status).toBe(200);
    expect(meBefore.body.user.email).toBe(email);

    // Separate client: authenticate via login instead of the register cookie.
    const fresh = createAgent();
    const login = await fresh.post("/api/auth/login").send({ email, password: TEST_PASSWORD });
    expect(login.status).toBe(200);

    const me = await fresh.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);
  });

  it("logout invalidates the session", async () => {
    const agent = createAgent();
    const email = randomEmail("logout");
    await agent.post("/api/auth/register").send({ name: "E", email, password: TEST_PASSWORD });

    const out = await agent.post("/api/auth/logout");
    expect(out.status).toBe(204);

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(401);
  });

  it("blocks unauthenticated access to protected routes", async () => {
    const agent = createAgent();
    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("enforces the CSRF origin guard on cookie-authenticated mutations", async () => {
    // Agent WITHOUT an Origin header (simulates a cross-site attacker whose
    // browser would still include the session cookie).
    const agent = request.agent(createApp());
    const email = randomEmail("csrf");
    await agent.post("/api/auth/register").send({ name: "F", email, password: TEST_PASSWORD });

    const res = await agent
      .patch("/api/auth/password")
      .send({ currentPassword: TEST_PASSWORD, newPassword: "ABrandNewPass123!" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});