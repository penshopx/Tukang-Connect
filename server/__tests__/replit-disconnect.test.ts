import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";

vi.mock("../storage.js", () => ({
  pool: { on: vi.fn() },
  storage: {
    getUserByEmail: vi.fn(),
    getUserById: vi.fn(),
    getProfileByUserId: vi.fn(),
    updateUserReplitId: vi.fn(),
  },
  withTransaction: vi.fn(),
  startupReady: Promise.resolve(),
}));

import { storage } from "../storage.js";
import { app } from "../app.js";

const PASSWORD = "password123";
const HASHED_PASSWORD = await bcrypt.hash(PASSWORD, 1);

const LINKED_USER = {
  id: 91,
  username: "linked-user",
  email: "linked@example.com",
  password: HASHED_PASSWORD,
  role: "pelanggan",
  fullName: "Linked User",
  createdAt: "2026-01-01T00:00:00.000Z",
  onboardingCompleted: true,
  replitId: "replit-sub-linked",
};

function resetMocks() {
  for (const fn of Object.values(storage) as ReturnType<typeof vi.fn>[]) {
    if (typeof fn?.mockReset === "function") fn.mockReset();
  }
}

async function authenticatedAgent() {
  const agent = request.agent(app);
  vi.mocked(storage.getUserByEmail).mockResolvedValueOnce(LINKED_USER as any);
  const login = await agent
    .post("/api/login")
    .send({ email: LINKED_USER.email, password: PASSWORD });
  expect(login.status).toBe(200);
  vi.mocked(storage.getUserById).mockResolvedValue(LINKED_USER as any);
  return agent;
}

describe("DELETE /api/auth/replit/link", () => {
  beforeEach(resetMocks);

  it("requires an authenticated session", async () => {
    const res = await request(app).delete("/api/auth/replit/link");

    expect(res.status).toBe(401);
    expect(storage.updateUserReplitId).not.toHaveBeenCalled();
  });

  it("disconnects a linked Replit account when a local password exists", async () => {
    const agent = await authenticatedAgent();
    vi.mocked(storage.getUserById).mockResolvedValueOnce(LINKED_USER as any);
    vi.mocked(storage.updateUserReplitId).mockResolvedValueOnce(undefined as any);

    const res = await agent.delete("/api/auth/replit/link");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, replitId: null });
    expect(storage.updateUserReplitId).toHaveBeenCalledOnce();
    expect(storage.updateUserReplitId).toHaveBeenCalledWith(LINKED_USER.id, null);
  });

  it("prevents a Replit-only account from being locked out", async () => {
    const agent = await authenticatedAgent();
    vi.mocked(storage.getUserById).mockResolvedValueOnce({
      ...LINKED_USER,
      password: "",
    } as any);

    const res = await agent.delete("/api/auth/replit/link");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password terlebih dahulu/i);
    expect(storage.updateUserReplitId).not.toHaveBeenCalled();
  });

  it("rejects disconnecting when no Replit account is linked", async () => {
    const agent = await authenticatedAgent();
    vi.mocked(storage.getUserById).mockResolvedValueOnce({
      ...LINKED_USER,
      replitId: null,
    } as any);

    const res = await agent.delete("/api/auth/replit/link");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/belum terhubung/i);
    expect(storage.updateUserReplitId).not.toHaveBeenCalled();
  });
});

describe("GET /api/me connection safety metadata", () => {
  beforeEach(resetMocks);

  it("exposes hasPassword without exposing the password hash", async () => {
    const agent = await authenticatedAgent();
    vi.mocked(storage.getUserById).mockResolvedValueOnce(LINKED_USER as any);
    vi.mocked(storage.getProfileByUserId).mockResolvedValueOnce({ userId: LINKED_USER.id } as any);

    const res = await agent.get("/api/me");

    expect(res.status).toBe(200);
    expect(res.body.hasPassword).toBe(true);
    expect(res.body).not.toHaveProperty("password");
  });
});