/**
 * Route smoke tests
 *
 * These tests exercise the exported Express app directly.  Storage and the
 * database pool are mocked so the suite validates route registration,
 * middleware ordering, response shapes, and authorization without starting a
 * server or reading/writing production data.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../storage.js", () => ({
  pool: {
    on: vi.fn(),
    query: vi.fn(),
  },
  storage: {
    getUserByEmail: vi.fn(),
    getUserById: vi.fn(),
    getJobs: vi.fn(),
    getUsers: vi.fn(),
    getJobById: vi.fn(),
    createJob: vi.fn(),
    updateJob: vi.fn(),
    getApplicationsByJob: vi.fn(),
    getProfiles: vi.fn(),
    getApplicationById: vi.fn(),
    updateApplication: vi.fn(),
    createApplication: vi.fn(),
    createNotification: vi.fn(),
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
    getMessagesByJob: vi.fn(),
    createMessage: vi.fn(),
    getDisputes: vi.fn(),
    createDispute: vi.fn(),
    getAnalytics: vi.fn(),
  },
  withTransaction: vi.fn(),
  contractFromRow: vi.fn((row) => ({
    id: row.id, jobId: row.job_id, clientId: row.client_id, workerId: row.worker_id,
    title: row.title, description: row.description, totalValue: String(row.total_value),
    status: row.status, clientSigned: row.client_signed, workerSigned: row.worker_signed,
    createdAt: row.created_at, startDate: row.start_date, endDate: row.end_date,
  })),
}));

import { pool, storage, withTransaction } from "../storage.js";
import { app } from "../app.js";

const PASSWORD_HASH =
  "$2b$10$7f/XLgajP4pD7TTgfLU6ueHcZTJZ6EtggkRFH.PtWgfaUaNzNDJey";

const OWNER = {
  id: 11,
  username: "route-owner",
  email: "route-owner@example.com",
  password: PASSWORD_HASH,
  role: "pelanggan",
  fullName: "Route Owner",
  createdAt: "2024-01-01T00:00:00.000Z",
  onboardingCompleted: true,
  replitId: null,
};

const ADMIN = {
  ...OWNER,
  id: 12,
  username: "route-admin",
  email: "route-admin@example.com",
  role: "admin",
  fullName: "Route Admin",
};

const WORKER = {
  ...OWNER,
  id: 13,
  username: "route-worker",
  email: "route-worker@example.com",
  role: "tukang",
  fullName: "Route Worker",
};

const OTHER_WORKER = {
  ...WORKER,
  id: 14,
  username: "other-route-worker",
  email: "other-route-worker@example.com",
  fullName: "Other Route Worker",
};

const JOB = {
  id: 21,
  title: "Renovasi rumah",
  description: "Renovasi dapur dan ruang tamu",
  category: "Renovasi",
  budget: "100000000",
  location: "Jakarta",
  status: "open",
  clientId: OWNER.id,
  workerId: null,
  createdAt: "2024-01-02T00:00:00.000Z",
  deadline: "2024-06-01T00:00:00.000Z",
};

const CONTRACT = {
  id: 31,
  jobId: JOB.id,
  clientId: OWNER.id,
  workerId: 13,
  title: "Kontrak renovasi",
  description: JOB.description,
  totalValue: "50000000",
  status: "active",
  clientSigned: true,
  workerSigned: false,
  createdAt: "2024-01-03T00:00:00.000Z",
  startDate: "2024-01-04T00:00:00.000Z",
  endDate: null,
};

const MILESTONE = {
  id: 41,
  contractId: CONTRACT.id,
  title: "Pekerjaan awal",
  description: "Persiapan dan mobilisasi",
  amount: "10000000",
  status: "in_progress",
  dueDate: "2024-02-01T00:00:00.000Z",
  completedAt: null,
  notes: null,
};

function resetMocks() {
  for (const fn of Object.values(storage) as ReturnType<typeof vi.fn>[]) {
    if (typeof fn?.mockReset === "function") fn.mockReset();
  }
  vi.mocked(pool.query).mockReset();
  vi.mocked(withTransaction).mockReset();
}

async function authenticatedAgent(user = OWNER) {
  vi.mocked(storage.getUserByEmail).mockResolvedValueOnce(user as any);

  const agent = request.agent(app);
  const login = await agent
    .post("/api/login")
    .send({ email: user.email, password: "pass123" });

  expect(login.status).toBe(200);
  expect(login.body).not.toHaveProperty("password");
  vi.mocked(storage.getUserById).mockResolvedValue(user as any);
  return agent;
}

describe("Express route smoke tests", () => {
  beforeEach(resetMocks);

  describe("public routes", () => {
    it("rejects non-text chatbot questions before the Q&A orchestrator runs", async () => {
      const response = await request(app)
        .post("/api/klinika/ask")
        .send({ question: { html: "<script>alert(1)</script>" } });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Pertanyaan wajib diisi" });
    });

    it("returns HTML-looking chatbot questions as JSON data without reflecting them in the answer", async () => {
      const payload = '<img src=x onerror="window.__chatbotXss = true">';
      const response = await request(app)
        .post("/api/klinika/ask")
        .send({ question: payload });

      expect(response.status).toBe(200);
      expect(response.body.question).toBe(payload);
      expect(response.body.primaryAnswer.answer).not.toContain("<img");
      expect(response.body.primaryAnswer.answer).not.toContain("<script");
    });

    it("serves the database-backed health check with the expected shape", async () => {
      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [{ "?column?": 1 }] } as any);

      const response = await request(app).get("/api/health");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body).toEqual({ status: "ok" });
      expect(pool.query).toHaveBeenCalledWith("SELECT 1");
    });

    it("lists jobs and includes the public client summary", async () => {
      vi.mocked(storage.getJobs).mockResolvedValueOnce([JOB] as any);
      vi.mocked(storage.getUsers).mockResolvedValueOnce([OWNER] as any);

      const response = await request(app)
        .get("/api/jobs")
        .query({ status: "open", search: "dapur" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          ...JOB,
          client: { id: OWNER.id, fullName: OWNER.fullName },
        },
      ]);
      expect(storage.getJobs).toHaveBeenCalledWith({
        category: undefined,
        status: "open",
        clientId: undefined,
      });
    });

    it("returns a canonical string budget that can be sent to the update endpoint", async () => {
      const jobFromGet = { ...JOB, budget: "250000000" };
      vi.mocked(storage.getJobById)
        .mockResolvedValueOnce(jobFromGet as any)
        .mockResolvedValueOnce(jobFromGet as any);
      vi.mocked(storage.getUserById).mockResolvedValueOnce(OWNER as any);
      vi.mocked(storage.updateJob).mockResolvedValueOnce(jobFromGet as any);

      const getResponse = await request(app).get(`/api/jobs/${JOB.id}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.budget).toEqual(expect.any(String));

      const agent = await authenticatedAgent(OWNER);
      const updateResponse = await agent
        .put(`/api/jobs/${JOB.id}`)
        .send({ budget: getResponse.body.budget });

      expect(updateResponse.status).toBe(200);
      expect(storage.updateJob).toHaveBeenCalledWith(JOB.id, {
        budget: getResponse.body.budget,
      });
    });

    it("returns a price suggestion with a stable agent response shape", async () => {
      const response = await request(app)
        .post("/api/agents/price-suggest")
        .send({ category: "Renovasi", location: "Jakarta" });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        agent: "PricingAgent",
        category: "Renovasi",
        location: "Jakarta",
      });
      expect(response.body.adjustedMin).toEqual(expect.any(Number));
      expect(response.body.adjustedMid).toEqual(expect.any(Number));
      expect(response.body.adjustedMax).toEqual(expect.any(Number));
    });

    it.each([
      {
        path: "/api/agents/price-suggest",
        payload: { category: "Renovasi", location: "Jakarta", existingBudget: "100000000" },
      },
      {
        path: "/api/agents/milestones",
        payload: { category: "Renovasi", budget: "100000000" },
      },
    ])("accepts canonical string budget values at $path", async ({ path, payload }) => {
      const response = await request(app).post(path).send(payload);

      expect(response.status).toBe(200);
    });

    it("returns milestone budgets and amounts as canonical strings", async () => {
      const response = await request(app)
        .post("/api/agents/milestones")
        .send({ category: "Renovasi", budget: 100000000 });

      expect(response.status).toBe(200);
      expect(response.body.budget).toBe("100000000");
      expect(response.body.budget).toEqual(expect.any(String));
      expect(response.body.milestones.length).toBeGreaterThan(0);
      expect(response.body.milestones[0].amount).toEqual(expect.any(String));
    });

    it("rejects unsafe numeric money literals while preserving large string values", async () => {
      const unsafe = await request(app)
        .post("/api/agents/milestones")
        .send({ category: "Renovasi", budget: 9007199254740992 });
      expect(unsafe.status).toBe(400);

      const exact = await request(app)
        .post("/api/agents/milestones")
        .send({ category: "Renovasi", budget: "9223372036854775807" });
      expect(exact.status).toBe(200);
      expect(exact.body.budget).toBe("9223372036854775807");
      const total = exact.body.milestones.reduce((sum: bigint, milestone: { amount: string }) => sum + BigInt(milestone.amount), 0n);
      expect(total).toBe(9223372036854775807n);
    });

    it.each([
      ["Renovasi", "1"],
      ["Renovasi", "2"],
      ["Renovasi", "3"],
      ["Renovasi", "4"],
      ["Renovasi", "5"],
      ["Renovasi", "6"],
      ["Renovasi", "7"],
      ["Renovasi", "8"],
      ["Renovasi", "9"],
      ["Konstruksi Baru", "5"],
      ["Konstruksi Baru", "6"],
      ["Konstruksi Baru", "7"],
      ["Konstruksi Baru", "8"],
      ["Konstruksi Baru", "9"],
    ])("generates only positive exact milestones for %s budget %s", async (category, budget) => {
      const response = await request(app)
        .post("/api/agents/milestones")
        .send({ category, budget });
      expect(response.status).toBe(200);
      expect(response.body.milestones.every((milestone: { amount: string }) => BigInt(milestone.amount) >= 1n)).toBe(true);
      expect(response.body.milestones.reduce((sum: bigint, milestone: { amount: string }) => sum + BigInt(milestone.amount), 0n)).toBe(BigInt(budget));
    });
  });

  describe("authenticated routes", () => {
    it("rejects a protected route when no session is present", async () => {
      const response = await request(app).get("/api/contracts");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: "Unauthorized" });
      expect(storage.getContracts).not.toHaveBeenCalled();
    });

    it("destroys a stale session before any protected route handler runs", async () => {
      const agent = await authenticatedAgent();
      vi.mocked(storage.getUserById).mockResolvedValueOnce(undefined as any);

      const staleResponse = await agent.get("/api/contracts");

      expect(staleResponse.status).toBe(401);
      expect(staleResponse.body).toEqual({ error: "Unauthorized" });
      expect(storage.getContracts).not.toHaveBeenCalled();

      vi.mocked(storage.getUserById).mockResolvedValueOnce(OWNER as any);
      const subsequentResponse = await agent.get("/api/contracts");

      expect(subsequentResponse.status).toBe(401);
      expect(subsequentResponse.body).toEqual({ error: "Unauthorized" });
      expect(storage.getUserById).toHaveBeenCalledTimes(1);
      expect(storage.getContracts).not.toHaveBeenCalled();
    });

    it("lists the signed-in user's contracts with participant summaries", async () => {
      const contractFromGet = { ...CONTRACT, totalValue: "825000000000000" };
      vi.mocked(storage.getContracts).mockResolvedValueOnce([contractFromGet] as any);
      vi.mocked(storage.getUsers).mockResolvedValueOnce([
        OWNER,
        { ...OWNER, id: 13, fullName: "Route Worker", role: "tukang" },
      ] as any);

      const agent = await authenticatedAgent();
      const response = await agent.get("/api/contracts");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          ...contractFromGet,
          client: { id: OWNER.id, fullName: OWNER.fullName },
          worker: { id: 13, fullName: "Route Worker" },
        },
      ]);
      expect(response.body[0].totalValue).toEqual(expect.any(String));
      expect(storage.getContracts).toHaveBeenCalledWith(OWNER.id);
    });

    describe("resource ownership", () => {
      it("forbids a worker from listing applications on another client's project", async () => {
        vi.mocked(storage.getJobById).mockResolvedValueOnce(JOB as any);

        const agent = await authenticatedAgent(WORKER);
        const response = await agent.get(`/api/jobs/${JOB.id}/applications`);

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "Forbidden" });
        expect(storage.getApplicationsByJob).not.toHaveBeenCalled();
        expect(storage.getUsers).not.toHaveBeenCalled();
        expect(storage.getProfiles).not.toHaveBeenCalled();
      });

      it("forbids an unrelated user from listing applications", async () => {
        vi.mocked(storage.getJobById).mockResolvedValueOnce(JOB as any);
        vi.mocked(storage.getApplicationsByJob).mockResolvedValueOnce([] as any);

        const agent = await authenticatedAgent(OTHER_WORKER);
        const response = await agent.get(`/api/jobs/${JOB.id}/applications`);

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "Forbidden" });
        expect(storage.getUsers).not.toHaveBeenCalled();
        expect(storage.getProfiles).not.toHaveBeenCalled();
      });

      it("forbids an unrelated user from reading job messages", async () => {
        vi.mocked(storage.getJobById).mockResolvedValueOnce(JOB as any);

        const agent = await authenticatedAgent(OTHER_WORKER);
        const response = await agent.get(`/api/jobs/${JOB.id}/messages`);

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "Forbidden" });
        expect(storage.getMessagesByJob).not.toHaveBeenCalled();
      });

      it("forbids an unrelated user from posting job messages", async () => {
        vi.mocked(storage.getJobById).mockResolvedValueOnce(JOB as any);

        const agent = await authenticatedAgent(OTHER_WORKER);
        const response = await agent
          .post(`/api/jobs/${JOB.id}/messages`)
          .send({ content: "Pesan tidak sah" });

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "Forbidden" });
        expect(storage.createMessage).not.toHaveBeenCalled();
      });

      it("allows an assigned worker to read job messages", async () => {
        const assignedJob = { ...JOB, workerId: WORKER.id, status: "in_progress" };
        vi.mocked(storage.getJobById).mockResolvedValueOnce(assignedJob as any);
        vi.mocked(storage.getMessagesByJob).mockResolvedValueOnce([] as any);
        vi.mocked(storage.getUsers).mockResolvedValueOnce([] as any);

        const agent = await authenticatedAgent(WORKER);
        const response = await agent.get(`/api/jobs/${JOB.id}/messages`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
        expect(storage.getMessagesByJob).toHaveBeenCalledWith(JOB.id);
      });

      it("forbids an unrelated user before loading nested contract data", async () => {
        vi.mocked(storage.getContractById).mockResolvedValueOnce(CONTRACT as any);

        const agent = await authenticatedAgent(OTHER_WORKER);
        const response = await agent.get(`/api/contracts/${CONTRACT.id}`);

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "Forbidden" });
        expect(storage.getMilestonesByContract).not.toHaveBeenCalled();
        expect(storage.getReportsByContract).not.toHaveBeenCalled();
      });

      it("does not allow direct contract creation", async () => {
        const agent = await authenticatedAgent(OWNER);
        const response = await agent.post("/api/contracts").send({
          jobId: JOB.id,
          clientId: OTHER_WORKER.id,
          workerId: OWNER.id,
          totalValue: "50000000",
          status: "completed",
        });

        expect(response.status).toBe(405);
        expect(response.body).toEqual({
          error: "Kontrak hanya dapat dibuat melalui penerimaan lamaran",
        });
        expect(storage.createContract).not.toHaveBeenCalled();
      });

      it("allows the contract client to update safe contract terms", async () => {
        vi.mocked(storage.getContractById).mockResolvedValueOnce(CONTRACT as any);
        vi.mocked(storage.updateContract).mockResolvedValueOnce({
          ...CONTRACT,
          totalValue: "60000000",
        } as any);

        const agent = await authenticatedAgent(OWNER);
        const response = await agent
          .put(`/api/contracts/${CONTRACT.id}`)
        .send({ totalValue: "60000000" });

        expect(response.status).toBe(200);
        expect(storage.updateContract).toHaveBeenCalledWith(CONTRACT.id, {
          totalValue: "60000000",
        });
      });

      it("forbids the contract worker from changing contract terms", async () => {
        vi.mocked(storage.getContractById).mockResolvedValueOnce(CONTRACT as any);

        const agent = await authenticatedAgent(WORKER);
        const response = await agent
          .put(`/api/contracts/${CONTRACT.id}`)
          .send({ totalValue: CONTRACT.totalValue });

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "Forbidden" });
        expect(storage.updateContract).not.toHaveBeenCalled();
      });

      it.each([
        { status: "completed" },
        { clientSigned: true },
        { workerSigned: true },
        { clientId: OTHER_WORKER.id },
        { workerId: OWNER.id },
      ])("rejects server-controlled contract fields from generic updates", async (field) => {
        vi.mocked(storage.getContractById).mockResolvedValueOnce(CONTRACT as any);

        const agent = await authenticatedAgent(OWNER);
        const response = await agent.put(`/api/contracts/${CONTRACT.id}`).send(field);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: "Payload kontrak tidak valid" });
        expect(storage.updateContract).not.toHaveBeenCalled();
      });

      it("allows an admin to update validated contract fields", async () => {
        vi.mocked(storage.getContractById).mockResolvedValueOnce(CONTRACT as any);
        vi.mocked(storage.updateContract).mockResolvedValueOnce({
          ...CONTRACT,
          totalValue: "75000000",
        } as any);

        const agent = await authenticatedAgent(ADMIN);
        const response = await agent
          .put(`/api/contracts/${CONTRACT.id}`)
        .send({ totalValue: "75000000" });

        expect(response.status).toBe(200);
        expect(storage.updateContract).toHaveBeenCalledWith(
          CONTRACT.id,
          { totalValue: "75000000" },
        );
      });

      it("allows only the contract client to create a server-controlled milestone", async () => {
        const payload = {
          title: MILESTONE.title,
          description: MILESTONE.description,
          amount: MILESTONE.amount,
          dueDate: MILESTONE.dueDate,
        };
        vi.mocked(storage.getContractById).mockResolvedValueOnce(CONTRACT as any);
        vi.mocked(storage.createMilestone).mockResolvedValueOnce(MILESTONE as any);

        const agent = await authenticatedAgent(OWNER);
        const response = await agent
          .post(`/api/contracts/${CONTRACT.id}/milestones`)
          .send(payload);

        expect(response.status).toBe(201);
        expect(storage.createMilestone).toHaveBeenCalledWith({
          ...payload,
          notes: null,
          contractId: CONTRACT.id,
          status: "in_progress",
          completedAt: null,
        });
      });

      it("forbids a worker from creating a milestone", async () => {
        vi.mocked(storage.getContractById).mockResolvedValueOnce(CONTRACT as any);

        const agent = await authenticatedAgent(WORKER);
        const response = await agent
          .post(`/api/contracts/${CONTRACT.id}/milestones`)
          .send({
            title: MILESTONE.title,
            description: MILESTONE.description,
            amount: MILESTONE.amount,
          });

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "Forbidden" });
        expect(storage.createMilestone).not.toHaveBeenCalled();
      });

      it("allows the worker to submit a milestone but forbids an unrelated user", async () => {
        vi.mocked(storage.getMilestoneById)
          .mockResolvedValueOnce(MILESTONE as any)
          .mockResolvedValueOnce(MILESTONE as any);
        vi.mocked(storage.getContractById)
          .mockResolvedValueOnce(CONTRACT as any)
          .mockResolvedValueOnce(CONTRACT as any);
        vi.mocked(storage.updateMilestone).mockResolvedValueOnce({
          ...MILESTONE,
          status: "submitted",
        } as any);

        const workerAgent = await authenticatedAgent(WORKER);
        const allowed = await workerAgent
          .put(`/api/milestones/${MILESTONE.id}/submit`)
          .send({ notes: "Sudah selesai" });

        expect(allowed.status).toBe(200);
        expect(storage.updateMilestone).toHaveBeenCalledWith(
          MILESTONE.id,
          {
            status: "submitted",
            notes: "Sudah selesai",
          },
          ["in_progress", "rejected"],
        );

        const outsiderAgent = await authenticatedAgent(OTHER_WORKER);
        const forbidden = await outsiderAgent
          .put(`/api/milestones/${MILESTONE.id}/submit`)
          .send({ notes: "Tidak sah" });

        expect(forbidden.status).toBe(403);
        expect(forbidden.body).toEqual({ error: "Forbidden" });
        expect(storage.updateMilestone).toHaveBeenCalledTimes(1);
      });

      it("allows the client to approve a milestone but not the worker", async () => {
        vi.mocked(storage.getMilestoneById)
          .mockResolvedValueOnce({ ...MILESTONE, status: "submitted" } as any)
          .mockResolvedValueOnce({ ...MILESTONE, status: "submitted" } as any);
        vi.mocked(storage.getContractById)
          .mockResolvedValueOnce(CONTRACT as any)
          .mockResolvedValueOnce(CONTRACT as any);
        vi.mocked(storage.updateMilestone).mockResolvedValueOnce({
          ...MILESTONE,
          status: "approved",
        } as any);

        const clientAgent = await authenticatedAgent(OWNER);
        const allowed = await clientAgent.put(`/api/milestones/${MILESTONE.id}/approve`);
        expect(allowed.status).toBe(200);
        expect(storage.updateMilestone).toHaveBeenCalledWith(
          MILESTONE.id,
          {
            status: "approved",
            completedAt: expect.any(String),
          },
          ["submitted"],
        );

        const workerAgent = await authenticatedAgent(WORKER);
        const forbidden = await workerAgent.put(`/api/milestones/${MILESTONE.id}/approve`);
        expect(forbidden.status).toBe(403);
        expect(storage.updateMilestone).toHaveBeenCalledTimes(1);
      });

      it("allows the client to reject a submitted milestone", async () => {
        vi.mocked(storage.getMilestoneById).mockResolvedValueOnce({
          ...MILESTONE,
          status: "submitted",
        } as any);
        vi.mocked(storage.getContractById).mockResolvedValueOnce(CONTRACT as any);
        vi.mocked(storage.updateMilestone).mockResolvedValueOnce({
          ...MILESTONE,
          status: "rejected",
        } as any);

        const agent = await authenticatedAgent(OWNER);
        const response = await agent
          .put(`/api/milestones/${MILESTONE.id}/reject`)
          .send({ notes: "Perlu revisi" });

        expect(response.status).toBe(200);
        expect(storage.updateMilestone).toHaveBeenCalledWith(
          MILESTONE.id,
          {
            status: "rejected",
            notes: "Perlu revisi",
            completedAt: null,
          },
          ["submitted"],
        );
      });

      it.each([
        {
          user: WORKER,
          action: "submit",
          status: "approved",
          error: "Status milestone tidak mengizinkan pengajuan",
        },
        {
          user: OWNER,
          action: "approve",
          status: "in_progress",
          error: "Milestone belum diajukan",
        },
        {
          user: OWNER,
          action: "reject",
          status: "approved",
          error: "Milestone belum diajukan",
        },
      ])("rejects invalid $status → $action milestone transitions", async ({ user, action, status, error }) => {
        vi.mocked(storage.getMilestoneById).mockResolvedValueOnce({
          ...MILESTONE,
          status,
        } as any);
        vi.mocked(storage.getContractById).mockResolvedValueOnce(CONTRACT as any);

        const agent = await authenticatedAgent(user);
        const response = await agent.put(`/api/milestones/${MILESTONE.id}/${action}`);

        expect(response.status).toBe(409);
        expect(response.body).toEqual({ error });
        expect(storage.updateMilestone).not.toHaveBeenCalled();
      });

      it("rejects milestone changes after the contract is no longer active", async () => {
        vi.mocked(storage.getMilestoneById).mockResolvedValueOnce(MILESTONE as any);
        vi.mocked(storage.getContractById).mockResolvedValueOnce({
          ...CONTRACT,
          status: "completed",
        } as any);

        const agent = await authenticatedAgent(WORKER);
        const response = await agent.put(`/api/milestones/${MILESTONE.id}/submit`);

        expect(response.status).toBe(409);
        expect(response.body).toEqual({ error: "Kontrak tidak aktif" });
        expect(storage.updateMilestone).not.toHaveBeenCalled();
      });

      it("forbids an unrelated user from contract reports", async () => {
        vi.mocked(storage.getContractById).mockResolvedValueOnce(CONTRACT as any);

        const agent = await authenticatedAgent(OTHER_WORKER);
        const response = await agent.get(`/api/contracts/${CONTRACT.id}/reports`);

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "Forbidden" });
        expect(storage.getReportsByContract).not.toHaveBeenCalled();
      });

      it("allows a contract participant to create a validated report", async () => {
        const payload = {
          type: "progress",
          title: "Laporan pekan pertama",
          description: "Pekerjaan sesuai rencana",
        };
        const report = {
          id: 61,
          contractId: CONTRACT.id,
          reporterId: WORKER.id,
          ...payload,
          attachments: [],
          createdAt: "2024-01-06T00:00:00.000Z",
        };
        vi.mocked(storage.getContractById).mockResolvedValueOnce(CONTRACT as any);
        vi.mocked(storage.createReport).mockResolvedValueOnce(report as any);

        const agent = await authenticatedAgent(WORKER);
        const response = await agent
          .post(`/api/contracts/${CONTRACT.id}/reports`)
          .send({ ...payload, reporterId: OWNER.id, attachments: ["forged"] });

        expect(response.status).toBe(400);
        expect(storage.createReport).not.toHaveBeenCalled();

        vi.mocked(storage.getContractById).mockResolvedValueOnce(CONTRACT as any);
        const validResponse = await agent
          .post(`/api/contracts/${CONTRACT.id}/reports`)
          .send(payload);

        expect(validResponse.status).toBe(201);
        expect(storage.createReport).toHaveBeenCalledWith({
          ...payload,
          contractId: CONTRACT.id,
          reporterId: WORKER.id,
          attachments: [],
        });
      });

      it("forbids an unrelated user from opening a dispute on another contract", async () => {
        vi.mocked(storage.getContractById).mockResolvedValueOnce(CONTRACT as any);

        const agent = await authenticatedAgent(OTHER_WORKER);
        const response = await agent.post("/api/disputes").send({
          contractId: CONTRACT.id,
          reason: "Percobaan sengketa tidak sah",
          status: "resolved",
          raisedById: OWNER.id,
        });

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "Forbidden" });
        expect(storage.createDispute).not.toHaveBeenCalled();
      });

      it("uses server-controlled dispute ownership and lifecycle fields", async () => {
        const dispute = {
          id: 71,
          contractId: CONTRACT.id,
          raisedById: WORKER.id,
          reason: "Masalah pembayaran milestone",
          status: "open",
          resolution: null,
          resolvedAt: null,
          createdAt: "2024-01-07T00:00:00.000Z",
        };
        vi.mocked(storage.getContractById).mockResolvedValueOnce(CONTRACT as any);
        vi.mocked(storage.createDispute).mockResolvedValueOnce(dispute as any);

        const agent = await authenticatedAgent(WORKER);
        const response = await agent.post("/api/disputes").send({
          contractId: CONTRACT.id,
          reason: dispute.reason,
          status: "resolved",
          raisedById: OWNER.id,
          resolution: "Dipalsukan",
          resolvedAt: "2024-01-01T00:00:00.000Z",
        });

        expect(response.status).toBe(201);
        expect(storage.createDispute).toHaveBeenCalledWith({
          contractId: CONTRACT.id,
          reason: dispute.reason,
          status: "open",
          raisedById: WORKER.id,
          resolution: null,
          resolvedAt: null,
        });
      });
    });

    describe("job mutations", () => {
      const newJobPayload = {
        title: "Bangun rumah baru",
        description: "Pembangunan rumah satu lantai",
        category: "Konstruksi Baru",
        budget: "250000000",
        location: "Bandung",
        deadline: "2025-06-01",
      };
      const createdJob = {
        ...JOB,
        ...newJobPayload,
      };
      const changes = {
        title: "Renovasi rumah diperbarui",
        budget: "125000000",
      };
      const updatedJob = { ...JOB, ...changes };

      it("creates a project from validated user-editable fields", async () => {
        vi.mocked(storage.createJob).mockResolvedValueOnce(createdJob as any);
        vi.mocked(storage.createNotification).mockResolvedValueOnce(undefined as any);

        const agent = await authenticatedAgent(OWNER);
        const response = await agent.post("/api/jobs").send(newJobPayload);

        expect(response.status).toBe(201);
        expect(response.body).toEqual(createdJob);
        expect(storage.createJob).toHaveBeenCalledWith({
          ...newJobPayload,
          clientId: OWNER.id,
          status: "open",
          workerId: null,
        });
        expect(storage.createJob).toHaveBeenCalledOnce();
      });

      it("uses server-controlled values and defaults an omitted deadline", async () => {
        const { deadline: _deadline, ...payloadWithoutDeadline } = newJobPayload;
        const createdJobWithoutDeadline = { ...createdJob, deadline: null };
        vi.mocked(storage.createJob).mockResolvedValueOnce(createdJobWithoutDeadline as any);
        vi.mocked(storage.createNotification).mockResolvedValueOnce(undefined as any);

        const agent = await authenticatedAgent(OWNER);
        const response = await agent.post("/api/jobs").send(payloadWithoutDeadline);

        expect(response.status).toBe(201);
        expect(storage.createJob).toHaveBeenCalledWith({
          ...payloadWithoutDeadline,
          deadline: null,
          clientId: OWNER.id,
          status: "open",
          workerId: null,
        });
      });

      it.each([
        { payload: {}, label: "rejects missing required fields" },
        { payload: { ...newJobPayload, title: "   " }, label: "rejects blank required values" },
        { payload: { ...newJobPayload, budget: true }, label: "rejects values with the wrong type" },
        { payload: { ...newJobPayload, budget: 9_007_199_254_740_993 }, label: "rejects unsafe numeric money" },
        { payload: { ...newJobPayload, deadline: "not-a-date" }, label: "rejects invalid deadline values" },
        {
          payload: { ...newJobPayload, status: "completed" },
          label: "rejects fields controlled by the server",
        },
      ])("$label", async ({ payload }) => {
        const agent = await authenticatedAgent(OWNER);
        const response = await agent.post("/api/jobs").send(payload);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: "Payload proyek tidak valid" });
        expect(storage.createJob).not.toHaveBeenCalled();
        expect(storage.createNotification).not.toHaveBeenCalled();
      });

      it("allows the project owner to update their own job", async () => {
        vi.mocked(storage.getJobById).mockResolvedValueOnce(JOB as any);
        vi.mocked(storage.updateJob).mockResolvedValueOnce(updatedJob as any);

        const agent = await authenticatedAgent(OWNER);
        const response = await agent.put(`/api/jobs/${JOB.id}`).send(changes);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(updatedJob);
        expect(storage.updateJob).toHaveBeenCalledWith(JOB.id, changes);
        expect(storage.updateJob).toHaveBeenCalledOnce();
        expect(storage.getUserById).toHaveBeenCalledOnce();
        expect(storage.getUserById).toHaveBeenCalledWith(OWNER.id);
      });

      it("forbids another user from updating the project", async () => {
        vi.mocked(storage.getJobById).mockResolvedValueOnce(JOB as any);
        vi.mocked(storage.getUserById).mockResolvedValueOnce(WORKER as any);

        const agent = await authenticatedAgent(WORKER);
        const response = await agent.put(`/api/jobs/${JOB.id}`).send(changes);

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "Forbidden" });
        expect(storage.updateJob).not.toHaveBeenCalled();
      });

      it("allows an admin to update a project owned by another user", async () => {
        vi.mocked(storage.getJobById).mockResolvedValueOnce(JOB as any);
        vi.mocked(storage.getUserById).mockResolvedValueOnce(ADMIN as any);
        vi.mocked(storage.updateJob).mockResolvedValueOnce(updatedJob as any);

        const agent = await authenticatedAgent(ADMIN);
        const response = await agent.put(`/api/jobs/${JOB.id}`).send(changes);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(updatedJob);
        expect(storage.updateJob).toHaveBeenCalledWith(JOB.id, changes);
        expect(storage.updateJob).toHaveBeenCalledOnce();
      });

      it.each([
        { deadline: "2024-02-29" },
        { deadline: "2025-03-04T00:00:00.000Z" },
        { deadline: null },
      ])("accepts the supported deadline value $deadline", async (payload) => {
        vi.mocked(storage.getJobById).mockResolvedValueOnce(JOB as any);
        vi.mocked(storage.updateJob).mockResolvedValueOnce({ ...JOB, ...payload } as any);

        const agent = await authenticatedAgent(OWNER);
        const response = await agent.put(`/api/jobs/${JOB.id}`).send(payload);

        expect(response.status).toBe(200);
        expect(storage.updateJob).toHaveBeenCalledWith(JOB.id, payload);
      });

      it.each([
        { payload: { clientId: OWNER.id }, label: "rejects fields controlled by the server" },
        { payload: { budget: true }, label: "rejects values with the wrong type" },
        { payload: { budget: 9_007_199_254_740_993 }, label: "rejects unsafe numeric money" },
        { payload: { title: "   " }, label: "rejects blank required values" },
        { payload: { deadline: "not-a-date" }, label: "rejects invalid deadline values" },
        { payload: { deadline: "2024-02-30" }, label: "rejects impossible calendar dates" },
        { payload: { deadline: "1" }, label: "rejects ambiguous parseable date values" },
        {
          payload: { deadline: "March 4, 2025" },
          label: "rejects prose date values",
        },
        { payload: {}, label: "rejects an empty update payload" },
      ])("$label", async ({ payload }) => {
        vi.mocked(storage.getJobById).mockResolvedValueOnce(JOB as any);

        const agent = await authenticatedAgent(OWNER);
        const response = await agent.put(`/api/jobs/${JOB.id}`).send(payload);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: "Payload proyek tidak valid" });
        expect(storage.updateJob).not.toHaveBeenCalled();
      });
    });

    describe("job applications", () => {
      const withdrawnApplication = {
        id: 41,
        jobId: JOB.id,
        applicantId: WORKER.id,
        message: "Lamaran lama",
        proposedBudget: "90000000",
        status: "withdrawn",
        createdAt: "2024-01-04T00:00:00.000Z",
      };

      beforeEach(() => {
        vi.mocked(storage.getJobById).mockResolvedValue(JOB as any);
        vi.mocked(storage.createNotification).mockResolvedValue(undefined as any);
      });

      it("allows a new application after the previous one was withdrawn", async () => {
        const renewedApplication = {
          ...withdrawnApplication,
          id: 42,
          message: "Saya siap mengerjakan proyek ini",
          status: "pending",
          createdAt: "2024-01-05T00:00:00.000Z",
        };
        vi.mocked(storage.getApplicationsByJob).mockResolvedValueOnce([
          withdrawnApplication,
        ] as any);
        vi.mocked(storage.createApplication).mockResolvedValueOnce(renewedApplication as any);

        const agent = await authenticatedAgent(WORKER);
        const response = await agent
          .post(`/api/jobs/${JOB.id}/apply`)
          .send({ message: renewedApplication.message, proposedBudget: "95000000" });

        expect(response.status).toBe(201);
        expect(response.body).toEqual(renewedApplication);
        expect(storage.createApplication).toHaveBeenCalledWith({
          jobId: JOB.id,
          applicantId: WORKER.id,
          message: renewedApplication.message,
          proposedBudget: "95000000",
          status: "pending",
        });
        expect(storage.createApplication).toHaveBeenCalledOnce();
      });

      it("rejects an unsafe numeric proposed budget", async () => {
        vi.mocked(storage.getApplicationsByJob).mockResolvedValueOnce([] as any);

        const agent = await authenticatedAgent(WORKER);
        const response = await agent
          .post(`/api/jobs/${JOB.id}/apply`)
          .send({ message: "Saya siap", proposedBudget: 9_007_199_254_740_993 });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: "Nominal penawaran tidak valid" });
        expect(storage.createApplication).not.toHaveBeenCalled();
      });

      it.each(["pending", "accepted"] as const)(
        "rejects a duplicate when the previous application is %s",
        async (status) => {
          vi.mocked(storage.getApplicationsByJob).mockResolvedValueOnce([
            { ...withdrawnApplication, status },
          ] as any);

          const agent = await authenticatedAgent(WORKER);
          const response = await agent
            .post(`/api/jobs/${JOB.id}/apply`)
            .send({ message: "Lamaran duplikat" });

          expect(response.status).toBe(400);
          expect(response.body).toEqual({ error: "Sudah melamar" });
          expect(storage.createApplication).not.toHaveBeenCalled();
        }
      );

      it("allows a worker to update their own pending application fields", async () => {
        const pendingApplication = {
          ...withdrawnApplication,
          status: "pending",
        };
        const changes = {
          message: "Pesan lamaran diperbarui",
          proposedBudget: "95000000",
        };
        const updatedApplication = { ...pendingApplication, ...changes };
        vi.mocked(storage.getApplicationById).mockResolvedValueOnce(pendingApplication as any);
        vi.mocked(storage.getUserById).mockResolvedValueOnce(WORKER as any);
        vi.mocked(storage.updateApplication).mockResolvedValueOnce(updatedApplication as any);

        const agent = await authenticatedAgent(WORKER);
        const response = await agent.put(`/api/applications/${pendingApplication.id}`).send(changes);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(updatedApplication);
        expect(storage.updateApplication).toHaveBeenCalledWith(
          pendingApplication.id,
          changes,
          "pending"
        );
      });

      it("returns an exact proposed budget string that can be sent to the update endpoint", async () => {
        const applicationFromGet = {
          ...withdrawnApplication,
          proposedBudget: "9007199254740993",
          status: "pending",
        };
        vi.mocked(storage.getApplicationsByJob).mockResolvedValueOnce([applicationFromGet] as any);
        vi.mocked(storage.getUsers).mockResolvedValueOnce([WORKER] as any);
        vi.mocked(storage.getProfiles).mockResolvedValueOnce([] as any);
        vi.mocked(storage.getApplicationById).mockResolvedValueOnce(applicationFromGet as any);
        vi.mocked(storage.getJobById).mockResolvedValue(JOB as any);
        vi.mocked(storage.updateApplication).mockResolvedValueOnce(applicationFromGet as any);

        const ownerAgent = await authenticatedAgent(OWNER);
        const getResponse = await ownerAgent.get(`/api/jobs/${JOB.id}/applications`);

        expect(getResponse.status).toBe(200);
        expect(getResponse.body[0].proposedBudget).toEqual(expect.any(String));

        const workerAgent = await authenticatedAgent(WORKER);
        const updateResponse = await workerAgent
          .put(`/api/applications/${applicationFromGet.id}`)
          .send({ proposedBudget: getResponse.body[0].proposedBudget });

        expect(updateResponse.status).toBe(200);
        expect(storage.updateApplication).toHaveBeenCalledWith(
          applicationFromGet.id,
          { proposedBudget: getResponse.body[0].proposedBudget },
          "pending",
        );
      });

      it("forbids a worker from updating another worker's application", async () => {
        const otherWorkerApplication = {
          ...withdrawnApplication,
          applicantId: 99,
          status: "pending",
        };
        vi.mocked(storage.getApplicationById).mockResolvedValueOnce(otherWorkerApplication as any);
        vi.mocked(storage.getUserById).mockResolvedValueOnce(WORKER as any);

        const agent = await authenticatedAgent(WORKER);
        const response = await agent
          .put(`/api/applications/${otherWorkerApplication.id}`)
          .send({ message: "Perubahan tidak sah" });

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "Forbidden" });
        expect(storage.updateApplication).not.toHaveBeenCalled();
      });

      it.each([
        [{ status: "accepted" }, "Status lamaran tidak diizinkan"],
        [{ applicantId: WORKER.id }, "Field lamaran tidak diizinkan"],
      ])(
        "rejects application fields or statuses a worker is not allowed to change",
        async (changes, error) => {
          const pendingApplication = {
            ...withdrawnApplication,
            status: "pending",
          };
          vi.mocked(storage.getApplicationById).mockResolvedValueOnce(pendingApplication as any);
          vi.mocked(storage.getUserById).mockResolvedValueOnce(WORKER as any);

          const agent = await authenticatedAgent(WORKER);
          const response = await agent
            .put(`/api/applications/${pendingApplication.id}`)
            .send(changes);

          expect(response.status).toBe(400);
          expect(response.body).toEqual({ error });
          expect(storage.updateApplication).not.toHaveBeenCalled();
        }
      );

      it("allows the project owner to reject a pending application", async () => {
        const pendingApplication = {
          ...withdrawnApplication,
          status: "pending",
        };
        const updatedApplication = { ...pendingApplication, status: "rejected" };
        vi.mocked(storage.getApplicationById).mockResolvedValueOnce(pendingApplication as any);
        vi.mocked(storage.getUserById).mockResolvedValueOnce(OWNER as any);
        vi.mocked(storage.updateApplication).mockResolvedValueOnce(updatedApplication as any);

        const agent = await authenticatedAgent(OWNER);
        const response = await agent
          .put(`/api/applications/${pendingApplication.id}`)
          .send({ status: "rejected" });

        expect(response.status).toBe(200);
        expect(response.body).toEqual(updatedApplication);
        expect(storage.updateApplication).toHaveBeenCalledWith(
          pendingApplication.id,
          { status: "rejected" },
          "pending"
        );
      });

      it("forbids a client from updating an application on another client's job", async () => {
        const otherClient = { ...OWNER, id: 14, email: "other-client@example.com" };
        const applicationOnOtherJob = {
          ...withdrawnApplication,
          status: "pending",
        };
        vi.mocked(storage.getApplicationById).mockResolvedValueOnce(applicationOnOtherJob as any);
        vi.mocked(storage.getUserById).mockResolvedValueOnce(otherClient as any);

        const agent = await authenticatedAgent(otherClient);
        const response = await agent
          .put(`/api/applications/${applicationOnOtherJob.id}`)
          .send({ status: "rejected" });

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "Forbidden" });
        expect(storage.updateApplication).not.toHaveBeenCalled();
      });

      it("does not let a client accept an application through the generic update route", async () => {
        const pendingApplication = {
          ...withdrawnApplication,
          status: "pending",
        };
        vi.mocked(storage.getApplicationById).mockResolvedValueOnce(pendingApplication as any);
        vi.mocked(storage.getUserById).mockResolvedValueOnce(OWNER as any);

        const agent = await authenticatedAgent(OWNER);
        const response = await agent
          .put(`/api/applications/${pendingApplication.id}`)
          .send({ status: "accepted" });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          error: "Klien hanya dapat menolak lamaran yang masih menunggu",
        });
        expect(storage.updateApplication).not.toHaveBeenCalled();
      });

      it("does not let a client change application content", async () => {
        const pendingApplication = {
          ...withdrawnApplication,
          status: "pending",
        };
        vi.mocked(storage.getApplicationById).mockResolvedValueOnce(pendingApplication as any);
        vi.mocked(storage.getUserById).mockResolvedValueOnce(OWNER as any);

        const agent = await authenticatedAgent(OWNER);
        const response = await agent
          .put(`/api/applications/${pendingApplication.id}`)
          .send({ message: "Diubah oleh klien" });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          error: "Klien hanya dapat menolak lamaran yang masih menunggu",
        });
        expect(storage.updateApplication).not.toHaveBeenCalled();
      });

      it("forbids accepting an application that belongs to a different job", async () => {
        const applicationOnAnotherJob = {
          ...withdrawnApplication,
          jobId: 99,
          status: "pending",
        };
        vi.mocked(storage.getJobById).mockResolvedValueOnce(JOB as any);
        vi.mocked(storage.getApplicationById).mockResolvedValueOnce(applicationOnAnotherJob as any);

        const agent = await authenticatedAgent(OWNER);
        const response = await agent.post(
          `/api/jobs/${JOB.id}/applications/${applicationOnAnotherJob.id}/accept`
        );

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "Forbidden" });
        expect(withTransaction).not.toHaveBeenCalled();
      });

      it("accepts using the transaction-locked negotiated budget", async () => {
        const staleApplication = { id: 88, jobId: JOB.id, applicantId: WORKER.id, proposedBudget: "10", status: "pending" };
        const lockedApplication = { id: 88, job_id: JOB.id, applicant_id: WORKER.id, proposed_budget: "9007199254740993", status: "pending" };
        const lockedJob = { id: JOB.id, client_id: OWNER.id, category: JOB.category, title: JOB.title, description: JOB.description, budget: JOB.budget, deadline: null };
        const client = { query: vi.fn()
          .mockResolvedValueOnce({ rows: [lockedApplication] })
          .mockResolvedValueOnce({ rows: [lockedJob] })
          .mockResolvedValueOnce({ rowCount: 1, rows: [] })
          .mockResolvedValueOnce({ rowCount: 1, rows: [] })
          .mockResolvedValueOnce({ rowCount: 1, rows: [] })
          .mockResolvedValueOnce({ rows: [{ id: 99, job_id: JOB.id, client_id: OWNER.id, worker_id: WORKER.id, title: "locked", description: "locked", total_value: lockedApplication.proposed_budget, status: "active", client_signed: true, worker_signed: false, created_at: "", start_date: "", end_date: null }] })
          .mockResolvedValue({ rows: [] }) };
        const agent = await authenticatedAgent(OWNER);
        vi.mocked(storage.getJobById).mockResolvedValueOnce(JOB as any);
        vi.mocked(storage.getApplicationById).mockResolvedValueOnce(staleApplication as any);
        vi.mocked(storage.getUserById).mockResolvedValueOnce(WORKER as any);
        vi.mocked(storage.getApplicationsByJob).mockResolvedValueOnce([] as any);
        vi.mocked(storage.createNotification).mockResolvedValue({} as any);
        vi.mocked(withTransaction).mockImplementation(async (callback: any) => callback(client));

        const response = await agent.post(`/api/jobs/${JOB.id}/applications/${staleApplication.id}/accept`);
        expect(response.status).toBe(200);
        expect(client.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO contracts"), expect.arrayContaining([WORKER.id, lockedApplication.proposed_budget]));
      });
    });
  });

  describe("admin authorization", () => {
    it("destroys a stale session before an admin handler runs", async () => {
      const agent = await authenticatedAgent(ADMIN);
      vi.mocked(storage.getUserById).mockResolvedValueOnce(undefined as any);

      const response = await agent.get("/api/admin/status");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: "Unauthorized" });
      expect(storage.getAnalytics).not.toHaveBeenCalled();
    });

    it("forbids a signed-in non-admin from an admin route", async () => {
      vi.mocked(storage.getUserById).mockResolvedValueOnce(OWNER as any);

      const agent = await authenticatedAgent();
      const response = await agent.get("/api/admin/status");

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: "Forbidden" });
      expect(storage.getAnalytics).not.toHaveBeenCalled();
    });

    it("allows an admin through the same middleware and returns analytics", async () => {
      const analytics = { totalUsers: 2, totalJobs: 1 };
      vi.mocked(storage.getUserById).mockResolvedValueOnce(ADMIN as any);
      vi.mocked(storage.getAnalytics).mockResolvedValueOnce(analytics as any);

      const agent = await authenticatedAgent(ADMIN);
      const response = await agent.get("/api/admin/status");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(analytics);
      expect(storage.getAnalytics).toHaveBeenCalledOnce();
    });
  });
});