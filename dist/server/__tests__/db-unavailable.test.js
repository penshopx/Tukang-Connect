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
import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
// ─── Simulated DB connection failure ─────────────────────────────────────────
const dbError = Object.assign(new Error("timeout expired – could not acquire a connection within 5000ms"), { code: "ETIMEDOUT" });
// ─── Fake user for establishing an authenticated session ──────────────────────
const FAKE_USER = {
    id: 42,
    username: "testuser",
    email: "testuser@example.com",
    password: "pass123",
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
        getUserByEmail: vi.fn(),
        getUserById: vi.fn(),
        getUserByUsername: vi.fn(),
        getUserByReplitId: vi.fn(),
        getUsers: vi.fn(),
        createUser: vi.fn(),
        createUserWithProfile: vi.fn(),
        updateUserReplitId: vi.fn(),
        updateUserRole: vi.fn(),
        getProfiles: vi.fn(),
        getProfileByUserId: vi.fn(),
        createProfile: vi.fn(),
        updateProfile: vi.fn(),
        getJobs: vi.fn(),
        getJobById: vi.fn(),
        createJob: vi.fn(),
        updateJob: vi.fn(),
        getApplicationsByJob: vi.fn(),
        getApplicationsByUser: vi.fn(),
        getApplicationsByApplicant: vi.fn(),
        getAllApplications: vi.fn(),
        getApplicationById: vi.fn(),
        createApplication: vi.fn(),
        updateApplication: vi.fn(),
        getAllContracts: vi.fn(),
        getContracts: vi.fn(),
        getContractById: vi.fn(),
        createContract: vi.fn(),
        updateContract: vi.fn(),
        getMilestonesByContract: vi.fn(),
        getMilestoneById: vi.fn(),
        createMilestone: vi.fn(),
        updateMilestone: vi.fn(),
        getReportsByContract: vi.fn(),
        createReport: vi.fn(),
        getDisputes: vi.fn(),
        getDisputeById: vi.fn(),
        createDispute: vi.fn(),
        updateDispute: vi.fn(),
        getReviewsByUser: vi.fn(),
        createReview: vi.fn(),
        getRating: vi.fn(),
        getPortfolioByUser: vi.fn(),
        createPortfolioItem: vi.fn(),
        deletePortfolioItem: vi.fn(),
        getNotifications: vi.fn(),
        getUnreadCount: vi.fn(),
        createNotification: vi.fn(),
        markNotificationRead: vi.fn(),
        markAllRead: vi.fn(),
        getMessagesByJob: vi.fn(),
        createMessage: vi.fn(),
        getAnalytics: vi.fn(),
    },
    withTransaction: vi.fn(),
}));
// Import real app AFTER vi.mock (hoisting guarantees the mock is registered
// before the module graph resolves, so app.ts picks up the mocked storage).
import { storage } from "../storage.js";
import { app } from "../app.js";
// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Reset every storage mock to its default state before each test. */
function resetStorageMocks() {
    for (const fn of Object.values(storage)) {
        if (typeof fn?.mockReset === "function")
            fn.mockReset();
    }
}
// ─── Tests ───────────────────────────────────────────────────────────────────
describe("API routes when database is unreachable", () => {
    beforeEach(() => {
        resetStorageMocks();
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
            expect(res.body).toHaveProperty("error");
            expect(typeof res.body.error).toBe("string");
            expect(res.body.error.length).toBeGreaterThan(0);
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
    // ── GET /api/jobs ─────────────────────────────────────────────────────────
    // No try/catch in the route — the async wrapper propagates the error to the
    // global handler which returns 500 { error: "Service temporarily unavailable" }.
    describe("GET /api/jobs", () => {
        it("returns HTTP 500 with { error: 'Service temporarily unavailable' } when the DB is down", async () => {
            vi.mocked(storage.getJobs).mockRejectedValue(dbError);
            const res = await request(app).get("/api/jobs");
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: "Service temporarily unavailable" });
        });
        it("does NOT expose a stack trace or raw Error fields in the response", async () => {
            vi.mocked(storage.getJobs).mockRejectedValue(dbError);
            const res = await request(app).get("/api/jobs");
            expect(res.body).not.toHaveProperty("stack");
            expect(res.body).not.toHaveProperty("message");
            expect(Object.keys(res.body)).toEqual(["error"]);
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
        /** Returns a supertest agent with an authenticated session cookie. */
        async function authenticatedAgent() {
            // Login succeeds — only getUserByEmail needs a happy-path return.
            vi.mocked(storage.getUserByEmail).mockResolvedValueOnce(FAKE_USER);
            const agent = request.agent(app); // agent preserves cookies across requests
            const loginRes = await agent
                .post("/api/login")
                .send({ email: FAKE_USER.email, password: FAKE_USER.password });
            expect(loginRes.status).toBe(200); // sanity-check: login worked
            return agent;
        }
        it("returns HTTP 500 with { error: 'Service temporarily unavailable' } when the DB is down", async () => {
            const agent = await authenticatedAgent();
            vi.mocked(storage.createContract).mockRejectedValue(dbError);
            const res = await agent
                .post("/api/contracts")
                .send(contractPayload);
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: "Service temporarily unavailable" });
        });
        it("does NOT expose a stack trace or raw Error fields in the response", async () => {
            const agent = await authenticatedAgent();
            vi.mocked(storage.createContract).mockRejectedValue(dbError);
            const res = await agent
                .post("/api/contracts")
                .send(contractPayload);
            expect(res.body).not.toHaveProperty("stack");
            expect(res.body).not.toHaveProperty("message");
            expect(Object.keys(res.body)).toEqual(["error"]);
        });
    });
});
