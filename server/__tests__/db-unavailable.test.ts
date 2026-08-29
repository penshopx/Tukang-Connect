/**
 * DB-unavailable tests
 *
 * Verifies that critical API routes return a structured JSON error (never a raw
 * crash) when the database is unreachable (simulated pool connection timeout).
 *
 * The real Express app is imported from server/app.ts so that production
 * middleware chains — including requireAuth and the global error handler — are
 * exercised exactly as they are in production.  The only substitution is the
 * storage module: every method is replaced with a vi.fn() that rejects with a
 * connection-timeout error.  In test mode (NODE_ENV=test, set automatically by
 * vitest) server/app.ts uses an in-memory session store so no pg connection is
 * needed for session management either.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";

// ─── Simulated DB connection failure ─────────────────────────────────────────

const dbError = Object.assign(
  new Error("timeout expired – could not acquire a connection within 5000ms"),
  { code: "ETIMEDOUT" }
);

const DB_UNAVAILABLE_MESSAGE = "Layanan sedang tidak tersedia. Silakan coba lagi.";
const GLOBAL_DB_UNAVAILABLE_RESPONSE = {
  code: "DB_UNAVAILABLE",
  error: "Database sedang tidak dapat dijangkau. Silakan coba lagi sebentar.",
};
const GLOBAL_HANDLER_RESPONSE = { error: "Service temporarily unavailable" };

// ─── Fake user for establishing an authenticated session ──────────────────────

// Plain-text password used in login calls; FAKE_USER.password is the bcrypt hash.
const FAKE_USER_PASSWORD = "pass123";

const FAKE_USER = {
  id: 42,
  username: "testuser",
  email: "testuser@example.com",
  // bcrypt hash of "pass123" — matches what the real DB would store
  password: "$2b$10$7f/XLgajP4pD7TTgfLU6ueHcZTJZ6EtggkRFH.PtWgfaUaNzNDJey",
  role: "pelanggan",
  fullName: "Test User",
  createdAt: "2024-01-01T00:00:00.000Z",
  replitId: null,
};

// ─── Mock the storage module (vi.mock is hoisted before any import) ───────────
//
// Every storage method is a vi.fn() so tests can override individual calls with
// mockResolvedValueOnce / mockRejectedValue.  The pool mock provides the .on()
// listener expected by pool.on("error", ...) in app.ts.

vi.mock("../storage.js", () => ({
  pool: { on: vi.fn() },
  storage: {
    getUserByEmail:         vi.fn(),
    getUserById:            vi.fn(),
    getUserByUsername:      vi.fn(),
    getUserByReplitId:      vi.fn(),
    getUsers:               vi.fn(),
    createUser:             vi.fn(),
    createUserWithProfile:  vi.fn(),
    updateUserReplitId:     vi.fn(),
    updateUserRole:         vi.fn(),
    getProfiles:            vi.fn(),
    getProfileByUserId:     vi.fn(),
    createProfile:          vi.fn(),
    updateProfile:          vi.fn(),
    getJobs:                vi.fn(),
    getJobById:             vi.fn(),
    createJob:              vi.fn(),
    updateJob:              vi.fn(),
    getApplicationsByJob:   vi.fn(),
    getApplicationsByUser:  vi.fn(),
    getApplicationsByApplicant: vi.fn(),
    getAllApplications:      vi.fn(),
    getApplicationById:     vi.fn(),
    createApplication:      vi.fn(),
    updateApplication:      vi.fn(),
    getAllContracts:         vi.fn(),
    getContracts:           vi.fn(),
    getContractById:        vi.fn(),
    createContract:         vi.fn(),
    updateContract:         vi.fn(),
    getMilestonesByContract: vi.fn(),
    getMilestoneById:       vi.fn(),
    createMilestone:        vi.fn(),
    updateMilestone:        vi.fn(),
    getReportsByContract:   vi.fn(),
    createReport:           vi.fn(),
    getDisputes:            vi.fn(),
    getDisputeById:         vi.fn(),
    createDispute:          vi.fn(),
    updateDispute:          vi.fn(),
    getReviewsByUser:       vi.fn(),
    createReview:           vi.fn(),
    getRating:              vi.fn(),
    getPortfolioByUser:     vi.fn(),
    createPortfolioItem:    vi.fn(),
    deletePortfolioItem:    vi.fn(),
    getNotifications:       vi.fn(),
    getUnreadCount:         vi.fn(),
    createNotification:     vi.fn(),
    markNotificationRead:   vi.fn(),
    markAllRead:            vi.fn(),
    getMessagesByJob:       vi.fn(),
    createMessage:          vi.fn(),
    getAnalytics:           vi.fn(),
  },
  withTransaction: vi.fn(),
}));

// Import real app AFTER vi.mock (hoisting guarantees the mock is registered
// before the module graph resolves, so app.ts picks up the mocked storage).
import { storage } from "../storage.js";
import { app }     from "../app.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Reset every storage mock to its default state before each test. */
function resetStorageMocks() {
  for (const fn of Object.values(storage) as ReturnType<typeof vi.fn>[]) {
    if (typeof fn?.mockReset === "function") fn.mockReset();
  }
}

/** Returns a supertest agent with an authenticated session cookie. */
async function authenticatedAgent() {
  vi.mocked(storage.getUserByEmail).mockResolvedValueOnce(FAKE_USER as any);

  const agent = request.agent(app);
  const loginRes = await agent
    .post("/api/login")
    .send({ email: FAKE_USER.email, password: FAKE_USER_PASSWORD });

  expect(loginRes.status).toBe(200);
  return agent;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("API routes when database is unreachable", () => {
  beforeEach(() => {
    resetStorageMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── POST /api/login ───────────────────────────────────────────────────────
  // This route has its own try/catch and returns 503 with a localised message.

  describe("POST /api/login", () => {
    it("returns HTTP 503 with a structured JSON body when the DB is down", async () => {
      vi.mocked(storage.getUserByEmail).mockRejectedValue(dbError);

      const res = await request(app)
        .post("/api/login")
        .send({ email: "any@test.com", password: "any" });

      expect(res.status).toBe(503);
      expect(res.headers["content-type"]).toMatch(/application\/json/);
      expect(res.body).toEqual({ error: DB_UNAVAILABLE_MESSAGE });
    });

    it("does NOT expose a stack trace or raw Error fields in the response", async () => {
      vi.mocked(storage.getUserByEmail).mockRejectedValue(dbError);

      const res = await request(app)
        .post("/api/login")
        .send({ email: "any@test.com", password: "any" });

      expect(res.body).not.toHaveProperty("stack");
      expect(res.body).not.toHaveProperty("message");
    });
  });

  // ── POST /api/register ─────────────────────────────────────────────────────
  // The first account lookup is a database operation and must produce the same
  // user-facing outage response as login when it cannot be completed.

  describe("POST /api/register", () => {
    it("returns HTTP 503 with a user-friendly JSON error when the DB is down", async () => {
      vi.mocked(storage.getUserByEmail).mockRejectedValue(dbError);

      const res = await request(app)
        .post("/api/register")
        .send({
          username: "newuser",
          email: "newuser@test.com",
          password: "password123",
          fullName: "New User",
          role: "pelanggan",
        });

      expect(res.status).toBe(503);
      expect(res.headers["content-type"]).toMatch(/application\/json/);
      expect(res.body).toEqual({ error: DB_UNAVAILABLE_MESSAGE });
    });
  });

  // ── Profile routes ─────────────────────────────────────────────────────────
  // These routes do not have local try/catch blocks.  A rejected storage call
  // must reach the global handler and become a safe JSON response instead of an
  // unhandled rejection or an HTML error page.  Database errors use the
  // retryable 503 response; unrelated errors use the generic 500 fallback.

  describe("GET /api/profiles", () => {
    it("returns HTTP 503 with a retryable DB_UNAVAILABLE response when profile loading fails", async () => {
      vi.mocked(storage.getProfiles).mockRejectedValue(dbError);

      const res = await request(app).get("/api/profiles");

      expect(res.status).toBe(503);
      expect(res.body).toEqual(GLOBAL_DB_UNAVAILABLE_RESPONSE);
    });

    it("returns HTTP 503 when loading the users used to enrich profiles fails", async () => {
      vi.mocked(storage.getProfiles).mockResolvedValue([]);
      vi.mocked(storage.getUsers).mockRejectedValue(dbError);

      const res = await request(app).get("/api/profiles");

      expect(res.status).toBe(503);
      expect(res.body).toEqual(GLOBAL_DB_UNAVAILABLE_RESPONSE);
    });

    it("returns HTTP 500 with the global structured error for a non-database failure", async () => {
      vi.mocked(storage.getProfiles).mockRejectedValue(new Error("profile loading failed"));

      const res = await request(app).get("/api/profiles");

      expect(res.status).toBe(500);
      expect(res.headers["content-type"]).toMatch(/application\/json/);
      expect(res.body).toEqual(GLOBAL_HANDLER_RESPONSE);
    });
  });

  describe("PUT /api/profiles", () => {
    it("returns HTTP 503 with a retryable DB_UNAVAILABLE response when profile saving fails", async () => {
      const agent = await authenticatedAgent();
      vi.mocked(storage.updateProfile).mockRejectedValue(dbError);

      const res = await agent
        .put("/api/profiles")
        .send({ bio: "Updated profile" });

      expect(res.status).toBe(503);
      expect(res.body).toEqual(GLOBAL_DB_UNAVAILABLE_RESPONSE);
    });

    it("returns HTTP 500 with the global structured error for a non-database failure", async () => {
      const agent = await authenticatedAgent();
      vi.mocked(storage.updateProfile).mockRejectedValue(new Error("profile saving failed"));

      const res = await agent
        .put("/api/profiles")
        .send({ bio: "Updated profile" });

      expect(res.status).toBe(500);
      expect(res.headers["content-type"]).toMatch(/application\/json/);
      expect(res.body).toEqual(GLOBAL_HANDLER_RESPONSE);
    });
  });

  describe("GET /api/profiles/:userId", () => {
    it("returns HTTP 503 when loading the requested profile fails", async () => {
      vi.mocked(storage.getProfileByUserId).mockRejectedValue(dbError);
      vi.mocked(storage.getUserById).mockResolvedValue(FAKE_USER as any);

      const res = await request(app).get(`/api/profiles/${FAKE_USER.id}`);

      expect(res.status).toBe(503);
      expect(res.body).toEqual(GLOBAL_DB_UNAVAILABLE_RESPONSE);
    });

    it("returns HTTP 503 when loading the profile owner fails", async () => {
      vi.mocked(storage.getProfileByUserId).mockResolvedValue({ userId: FAKE_USER.id } as any);
      vi.mocked(storage.getUserById).mockRejectedValue(dbError);

      const res = await request(app).get(`/api/profiles/${FAKE_USER.id}`);

      expect(res.status).toBe(503);
      expect(res.body).toEqual(GLOBAL_DB_UNAVAILABLE_RESPONSE);
    });
  });

  describe("GET /api/me", () => {
    it("returns HTTP 503 when the current user cannot be loaded", async () => {
      const agent = await authenticatedAgent();
      vi.mocked(storage.getUserById).mockRejectedValue(dbError);

      const res = await agent.get("/api/me");

      expect(res.status).toBe(503);
      expect(res.body).toEqual(GLOBAL_DB_UNAVAILABLE_RESPONSE);
    });

    it("returns HTTP 503 when the current user's profile cannot be loaded", async () => {
      const agent = await authenticatedAgent();
      vi.mocked(storage.getUserById).mockResolvedValue(FAKE_USER as any);
      vi.mocked(storage.getProfileByUserId).mockRejectedValue(dbError);

      const res = await agent.get("/api/me");

      expect(res.status).toBe(503);
      expect(res.body).toEqual(GLOBAL_DB_UNAVAILABLE_RESPONSE);
    });

    it("returns HTTP 500 with the global structured error for a non-database failure", async () => {
      const agent = await authenticatedAgent();
      vi.mocked(storage.getUserById).mockRejectedValue(new Error("current user loading failed"));

      const res = await agent.get("/api/me");

      expect(res.status).toBe(500);
      expect(res.headers["content-type"]).toMatch(/application\/json/);
      expect(res.body).toEqual(GLOBAL_HANDLER_RESPONSE);
    });
  });

  // ── GET /api/auth/user ─────────────────────────────────────────────────────
  // This authenticated session lookup is used when restoring a session after
  // login.  Its storage failure must keep the same safe response contract as
  // the other routes handled by the global error handler.

  describe("GET /api/auth/user", () => {
    it("returns HTTP 503 with a structured DB_UNAVAILABLE response without raw error details", async () => {
      const agent = await authenticatedAgent();
      vi.mocked(storage.getUserById).mockRejectedValue(dbError);

      const res = await agent.get("/api/auth/user");

      expect(res.status).toBe(503);
      expect(res.headers["content-type"]).toMatch(/application\/json/);
      expect(res.body).toEqual(GLOBAL_DB_UNAVAILABLE_RESPONSE);
      expect(res.body).not.toHaveProperty("stack");
      expect(res.body).not.toHaveProperty("message");
    });
  });

  // ── GET /api/jobs ─────────────────────────────────────────────────────────
  // No try/catch in the route — the async wrapper propagates the error to the
  // global handler which returns a retryable 503 DB_UNAVAILABLE response.

  describe("GET /api/jobs", () => {
    it("returns HTTP 503 with a retryable DB_UNAVAILABLE response when the DB is down", async () => {
      vi.mocked(storage.getJobs).mockRejectedValue(dbError);

      const res = await request(app).get("/api/jobs");

      expect(res.status).toBe(503);
      expect(res.body).toEqual(GLOBAL_DB_UNAVAILABLE_RESPONSE);
    });

    it("does NOT expose a stack trace or raw Error fields in the response", async () => {
      vi.mocked(storage.getJobs).mockRejectedValue(dbError);

      const res = await request(app).get("/api/jobs");

      expect(res.body).not.toHaveProperty("stack");
      expect(res.body).not.toHaveProperty("message");
      expect(Object.keys(res.body).sort()).toEqual(["code", "error"]);
    });

    it("logs the route path and identifies database failures as storage errors", async () => {
      const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(storage.getJobs).mockRejectedValue(dbError);

      await request(app).get("/api/jobs");

      expect(errorLog).toHaveBeenCalledWith(
        "[route] GET /api/jobs [storage] unhandled error",
        dbError
      );
    });

    it("labels non-database route failures as application errors", async () => {
      const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(storage.getJobs).mockResolvedValue([null as any]);
      vi.mocked(storage.getUsers).mockResolvedValue([FAKE_USER as any]);

      await request(app).get("/api/jobs");

      expect(errorLog).toHaveBeenCalledWith(
        "[route] GET /api/jobs [application] unhandled error",
        expect.any(TypeError)
      );
    });
  });

  // ── POST /api/contracts ───────────────────────────────────────────────────
  // Protected by requireAuth.  We establish a real session via POST /api/login
  // (with a mock user that succeeds) then submit the contracts request with the
  // session cookie so requireAuth passes and the DB error is exercised inside
  // the actual route handler.

  describe("POST /api/contracts", () => {
    const contractPayload = {
      jobId: 1,
      clientId: 1,
      workerId: 2,
      title: "Test Contract",
      description: "Test",
      totalValue: 1_000_000,
      status: "draft",
      clientSigned: false,
      workerSigned: false,
    };

    it("returns HTTP 503 with a retryable DB_UNAVAILABLE response when the DB is down", async () => {
      const agent = await authenticatedAgent();

      vi.mocked(storage.createContract).mockRejectedValue(dbError);

      const res = await agent
        .post("/api/contracts")
        .send(contractPayload);

      expect(res.status).toBe(503);
      expect(res.body).toEqual(GLOBAL_DB_UNAVAILABLE_RESPONSE);
    });

    it("does NOT expose a stack trace or raw Error fields in the response", async () => {
      const agent = await authenticatedAgent();

      vi.mocked(storage.createContract).mockRejectedValue(dbError);

      const res = await agent
        .post("/api/contracts")
        .send(contractPayload);

      expect(res.body).not.toHaveProperty("stack");
      expect(res.body).not.toHaveProperty("message");
      expect(Object.keys(res.body).sort()).toEqual(["code", "error"]);
    });
  });
});
