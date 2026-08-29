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
    updateJob: vi.fn(),
    getApplicationsByJob: vi.fn(),
    getApplicationById: vi.fn(),
    updateApplication: vi.fn(),
    createApplication: vi.fn(),
    createNotification: vi.fn(),
    getContracts: vi.fn(),
    getAnalytics: vi.fn(),
  },
  withTransaction: vi.fn(),
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

const JOB = {
  id: 21,
  title: "Renovasi rumah",
  description: "Renovasi dapur dan ruang tamu",
  category: "Renovasi",
  budget: 100000000,
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
  totalValue: 50000000,
  status: "active",
  clientSigned: true,
  workerSigned: false,
  createdAt: "2024-01-03T00:00:00.000Z",
  startDate: "2024-01-04T00:00:00.000Z",
  endDate: null,
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
  return agent;
}

describe("Express route smoke tests", () => {
  beforeEach(resetMocks);

  describe("public routes", () => {
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
  });

  describe("authenticated routes", () => {
    it("rejects a protected route when no session is present", async () => {
      const response = await request(app).get("/api/contracts");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: "Unauthorized" });
      expect(storage.getContracts).not.toHaveBeenCalled();
    });

    it("lists the signed-in user's contracts with participant summaries", async () => {
      vi.mocked(storage.getContracts).mockResolvedValueOnce([CONTRACT] as any);
      vi.mocked(storage.getUsers).mockResolvedValueOnce([
        OWNER,
        { ...OWNER, id: 13, fullName: "Route Worker", role: "tukang" },
      ] as any);

      const agent = await authenticatedAgent();
      const response = await agent.get("/api/contracts");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          ...CONTRACT,
          client: { id: OWNER.id, fullName: OWNER.fullName },
          worker: { id: 13, fullName: "Route Worker" },
        },
      ]);
      expect(storage.getContracts).toHaveBeenCalledWith(OWNER.id);
    });

    describe("job mutations", () => {
      const changes = {
        title: "Renovasi rumah diperbarui",
        budget: 125000000,
      };
      const updatedJob = { ...JOB, ...changes };

      it("allows the project owner to update their own job", async () => {
        vi.mocked(storage.getJobById).mockResolvedValueOnce(JOB as any);
        vi.mocked(storage.updateJob).mockResolvedValueOnce(updatedJob as any);

        const agent = await authenticatedAgent(OWNER);
        const response = await agent.put(`/api/jobs/${JOB.id}`).send(changes);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(updatedJob);
        expect(storage.updateJob).toHaveBeenCalledWith(JOB.id, changes);
        expect(storage.updateJob).toHaveBeenCalledOnce();
        expect(storage.getUserById).not.toHaveBeenCalled();
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
        { payload: { budget: "125000000" }, label: "rejects values with the wrong type" },
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
        proposedBudget: 90000000,
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
          .send({ message: renewedApplication.message, proposedBudget: 95000000 });

        expect(response.status).toBe(201);
        expect(response.body).toEqual(renewedApplication);
        expect(storage.createApplication).toHaveBeenCalledWith({
          jobId: JOB.id,
          applicantId: WORKER.id,
          message: renewedApplication.message,
          proposedBudget: 95000000,
          status: "pending",
        });
        expect(storage.createApplication).toHaveBeenCalledOnce();
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
          proposedBudget: 95000000,
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
    });
  });

  describe("admin authorization", () => {
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