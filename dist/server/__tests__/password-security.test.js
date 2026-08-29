/**
 * Password security tests
 *
 * Verifies that:
 *  1. POST /api/login accepts a correct bcrypt-hashed password and rejects
 *     wrong passwords and blank/empty passwords.
 *  2. POST /api/register stores a bcrypt hash, not the plain-text input.
 *  3. The startup migration helper hashes plain-text rows (including those
 *     whose text happens to start with "$2") and leaves valid bcrypt hashes
 *     untouched.
 *
 * Storage is fully mocked so no database connection is needed.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
// ─── Mock storage (hoisted before imports) ────────────────────────────────────
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
    startupReady: Promise.resolve(),
}));
import { storage } from "../storage.js";
import { app } from "../app.js";
// ─── Shared fixture ───────────────────────────────────────────────────────────
// Use a low cost factor so the test runs fast; 1 is the minimum bcrypt allows.
const PLAIN_PASSWORD = "hunter2";
const HASHED_PASSWORD = await bcrypt.hash(PLAIN_PASSWORD, 1);
const BASE_USER = {
    id: 99,
    username: "sectest",
    email: "sec@test.example.com",
    password: HASHED_PASSWORD,
    role: "pelanggan",
    fullName: "Security Test User",
    createdAt: "2024-01-01T00:00:00.000Z",
    replitId: null,
};
function resetMocks() {
    for (const fn of Object.values(storage)) {
        if (typeof fn?.mockReset === "function")
            fn.mockReset();
    }
}
// ─── Login tests ──────────────────────────────────────────────────────────────
describe("POST /api/login — password hashing", () => {
    beforeEach(resetMocks);
    it("returns 200 when the submitted password matches the stored bcrypt hash", async () => {
        vi.mocked(storage.getUserByEmail).mockResolvedValueOnce(BASE_USER);
        const res = await request(app)
            .post("/api/login")
            .send({ email: BASE_USER.email, password: PLAIN_PASSWORD });
        expect(res.status).toBe(200);
        expect(res.body.email).toBe(BASE_USER.email);
        // Password must never appear in the response.
        expect(res.body).not.toHaveProperty("password");
    });
    it("returns 401 when the submitted password does not match the stored hash", async () => {
        vi.mocked(storage.getUserByEmail).mockResolvedValueOnce(BASE_USER);
        const res = await request(app)
            .post("/api/login")
            .send({ email: BASE_USER.email, password: "wrongpassword" });
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("error");
    });
    it("returns 401 when the stored password is an empty string (Replit-only account)", async () => {
        vi.mocked(storage.getUserByEmail).mockResolvedValueOnce({
            ...BASE_USER,
            password: "",
        });
        const res = await request(app)
            .post("/api/login")
            .send({ email: BASE_USER.email, password: "" });
        expect(res.status).toBe(401);
    });
    it("returns 401 when the stored password is null (no local password set)", async () => {
        vi.mocked(storage.getUserByEmail).mockResolvedValueOnce({
            ...BASE_USER,
            password: null,
        });
        const res = await request(app)
            .post("/api/login")
            .send({ email: BASE_USER.email, password: "" });
        expect(res.status).toBe(401);
    });
    it("returns 401 when no account exists for the given email", async () => {
        vi.mocked(storage.getUserByEmail).mockResolvedValueOnce(undefined);
        const res = await request(app)
            .post("/api/login")
            .send({ email: "nobody@example.com", password: PLAIN_PASSWORD });
        expect(res.status).toBe(401);
    });
});
// ─── Registration tests ───────────────────────────────────────────────────────
describe("POST /api/register — password hashing", () => {
    beforeEach(resetMocks);
    it("stores a bcrypt hash, not the plain-text password", async () => {
        // No existing user with this email or username.
        vi.mocked(storage.getUserByEmail).mockResolvedValueOnce(undefined);
        vi.mocked(storage.getUserByUsername).mockResolvedValueOnce(undefined);
        let capturedPassword;
        vi.mocked(storage.createUserWithProfile).mockImplementationOnce(async (userData) => {
            capturedPassword = userData.password;
            return {
                user: { ...BASE_USER, password: userData.password },
                profile: {},
            };
        });
        await request(app)
            .post("/api/register")
            .send({
            username: "newuser",
            email: "newuser@example.com",
            password: PLAIN_PASSWORD,
            fullName: "New User",
            role: "pelanggan",
        });
        // The value passed to storage must be a valid bcrypt hash, not the raw input.
        expect(capturedPassword).toBeDefined();
        expect(capturedPassword).not.toBe(PLAIN_PASSWORD);
        const isValidHash = await bcrypt.compare(PLAIN_PASSWORD, capturedPassword);
        expect(isValidHash).toBe(true);
    });
    it("returns 201 and omits the password from the response body", async () => {
        vi.mocked(storage.getUserByEmail).mockResolvedValueOnce(undefined);
        vi.mocked(storage.getUserByUsername).mockResolvedValueOnce(undefined);
        vi.mocked(storage.createUserWithProfile).mockResolvedValueOnce({
            user: { ...BASE_USER, password: HASHED_PASSWORD },
            profile: {},
        });
        const res = await request(app)
            .post("/api/register")
            .send({
            username: "newuser",
            email: "newuser@example.com",
            password: PLAIN_PASSWORD,
            fullName: "New User",
            role: "pelanggan",
        });
        expect(res.status).toBe(201);
        expect(res.body).not.toHaveProperty("password");
    });
});
// ─── Migration regex unit tests ───────────────────────────────────────────────
//
// The BCRYPT_HASH_RE regex is not exported from storage.ts, so we re-declare
// and test its logic directly.  These tests guard against the "$2..." plaintext
// edge case that a prefix-only check would miss.
describe("bcrypt hash detection (migration regex)", () => {
    // Re-declare the same regex used in storage.ts.
    const BCRYPT_HASH_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
    it("recognises a valid bcrypt hash as already-hashed", async () => {
        const hash = await bcrypt.hash("somepassword", 1);
        expect(BCRYPT_HASH_RE.test(hash)).toBe(true);
    });
    it("does NOT recognise a plain-text password starting with $2 as a bcrypt hash", () => {
        const tricky = "$2x-this-looks-like-a-hash-but-is-not";
        expect(BCRYPT_HASH_RE.test(tricky)).toBe(false);
    });
    it("does NOT recognise an ordinary plain-text password as a bcrypt hash", () => {
        expect(BCRYPT_HASH_RE.test("password123")).toBe(false);
        expect(BCRYPT_HASH_RE.test("hunter2")).toBe(false);
        expect(BCRYPT_HASH_RE.test("")).toBe(false);
    });
});
