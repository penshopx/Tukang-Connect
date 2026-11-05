import { vi, describe, it, expect, beforeEach } from "vitest";

const { poolMock, clientMock } = vi.hoisted(() => {
  const client = {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: vi.fn(),
  };
  const pool = {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: vi.fn().mockResolvedValue(client),
    on: vi.fn(),
  };
  return { poolMock: pool, clientMock: client };
});

vi.mock("pg", () => ({
  default: {
    Pool: function Pool() {
      return poolMock;
    },
  },
}));

import { startupReady, storage } from "../storage.js";

const BIGINT_BUDGET = "9007199254740993";
const BIGINT_PROPOSED_BUDGET = "9223372036854775807";
const BIGINT_CONTRACT_VALUE = "9223372036854775807";
const BIGINT_MAX = "9223372036854775807";
const JOB_ROW = {
  id: 21,
  title: "Renovasi rumah",
  description: "Renovasi dapur dan ruang tamu",
  category: "Renovasi",
  budget: BIGINT_BUDGET,
  location: "Jakarta",
  status: "open",
  client_id: 11,
  worker_id: null,
  created_at: new Date("2024-01-02T00:00:00.000Z"),
  deadline: new Date("2024-06-01T00:00:00.000Z"),
};

const APPLICATION_ROW = {
  id: 31,
  job_id: JOB_ROW.id,
  applicant_id: 22,
  message: "Siap mengerjakan proyek ini",
  proposed_budget: BIGINT_PROPOSED_BUDGET,
  status: "pending",
  created_at: new Date("2024-01-03T00:00:00.000Z"),
};

const CONTRACT_ROW = {
  id: 41,
  job_id: JOB_ROW.id,
  client_id: 11,
  worker_id: 22,
  title: "Kontrak renovasi",
  description: JOB_ROW.description,
  total_value: BIGINT_CONTRACT_VALUE,
  status: "active",
  client_signed: true,
  worker_signed: false,
  created_at: new Date("2024-01-04T00:00:00.000Z"),
  start_date: new Date("2024-01-05T00:00:00.000Z"),
  end_date: null,
};

const PROFILE_ROW = {
  id: 61,
  user_id: 22,
  bio: "Tukang berpengalaman",
  location: "Jakarta",
  skills: ["Renovasi"],
  category: "Renovasi",
  hourly_rate: BIGINT_MAX,
  is_verified: false,
  is_mandor: false,
  certifications: [],
  avatar_url: null,
  completed_projects: 0,
  rating: 0,
  rating_count: 0,
  years_experience: 5,
  phone: null,
  kkni_level: null,
};

const PROFILE_INPUT = {
  userId: PROFILE_ROW.user_id,
  bio: PROFILE_ROW.bio,
  location: PROFILE_ROW.location,
  skills: PROFILE_ROW.skills,
  category: PROFILE_ROW.category,
  hourlyRate: BIGINT_MAX,
  isVerified: PROFILE_ROW.is_verified,
  isMandor: PROFILE_ROW.is_mandor,
  certifications: PROFILE_ROW.certifications,
  avatarUrl: PROFILE_ROW.avatar_url,
  completedProjects: PROFILE_ROW.completed_projects,
  rating: PROFILE_ROW.rating,
  ratingCount: PROFILE_ROW.rating_count,
  yearsExperience: PROFILE_ROW.years_experience,
  phone: PROFILE_ROW.phone,
  kkniLevel: PROFILE_ROW.kkni_level,
};

describe("storage monetary value normalization", () => {
  beforeEach(async () => {
    await startupReady;
    vi.clearAllMocks();
    clientMock.query.mockResolvedValue({ rows: [], rowCount: 0 });
    poolMock.query.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it.each([
    ["getJobs", () => storage.getJobs()],
    ["getJobById", () => storage.getJobById(JOB_ROW.id)],
    [
      "createJob",
      () =>
        storage.createJob({
          title: JOB_ROW.title,
          description: JOB_ROW.description,
          category: JOB_ROW.category,
          budget: BIGINT_BUDGET,
          location: JOB_ROW.location,
          status: "open",
          clientId: JOB_ROW.client_id,
          workerId: null,
          deadline: JOB_ROW.deadline.toISOString(),
        }),
    ],
    [
      "updateJob",
      () => storage.updateJob(JOB_ROW.id, { budget: BIGINT_BUDGET }),
    ],
  ])("normalizes BIGINT budget values returned by %s", async (_method, operation) => {
    poolMock.query.mockResolvedValueOnce({ rows: [JOB_ROW] });

    const result = await operation();
    const jobs = Array.isArray(result) ? result : [result];

    expect(jobs[0]?.budget).toBe(BIGINT_BUDGET);
    expect(typeof jobs[0]?.budget).toBe("string");
  });

  it("canonicalizes internal monetary writes before querying PostgreSQL", async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [{ ...JOB_ROW, budget: "5" }] });
    await storage.createJob({
      title: JOB_ROW.title, description: JOB_ROW.description, category: JOB_ROW.category,
      budget: "0005" as any, location: JOB_ROW.location, status: "open",
      clientId: JOB_ROW.client_id, workerId: null, deadline: null,
    });
    expect(poolMock.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO jobs"), expect.arrayContaining(["5"]));
  });

  it("rejects invalid internal monetary writes before querying PostgreSQL", async () => {
    await expect(storage.createJob({
      title: JOB_ROW.title, description: JOB_ROW.description, category: JOB_ROW.category,
      budget: "1.5" as any, location: JOB_ROW.location, status: "open",
      clientId: JOB_ROW.client_id, workerId: null, deadline: null,
    })).rejects.toThrow("Storage operation failed: createJob");
    expect(poolMock.query).not.toHaveBeenCalled();
  });

  it("tags invalid persisted money as a data-integrity error", async () => {
    poolMock.query.mockResolvedValueOnce({
      rows: [{ ...JOB_ROW, budget: "9223372036854775808" }],
    });

    await expect(storage.getJobById(JOB_ROW.id)).rejects.toMatchObject({
      cause: {
        code: "INVALID_MONEY_DATA",
        field: "jobs.budget",
      },
    });
  });

  it.each([
    ["getApplicationsByJob", () => storage.getApplicationsByJob(JOB_ROW.id)],
    ["getApplicationsByUser", () => storage.getApplicationsByUser(APPLICATION_ROW.applicant_id)],
    ["getApplicationsByApplicant", () => storage.getApplicationsByApplicant(APPLICATION_ROW.applicant_id)],
    ["getAllApplications", () => storage.getAllApplications()],
    ["getApplicationById", () => storage.getApplicationById(APPLICATION_ROW.id)],
    [
      "createApplication",
      () =>
        storage.createApplication({
          jobId: APPLICATION_ROW.job_id,
          applicantId: APPLICATION_ROW.applicant_id,
          message: APPLICATION_ROW.message,
          proposedBudget: BIGINT_PROPOSED_BUDGET,
          status: "pending",
        }),
    ],
    [
      "updateApplication",
      () =>
        storage.updateApplication(
          APPLICATION_ROW.id,
           { proposedBudget: BIGINT_PROPOSED_BUDGET },
        ),
    ],
  ])("normalizes BIGINT proposed budgets returned by %s", async (_method, operation) => {
    poolMock.query.mockResolvedValueOnce({ rows: [APPLICATION_ROW] });

    const result = await operation();
    const applications = Array.isArray(result) ? result : [result];

    expect(applications[0]?.proposedBudget).toBe(BIGINT_PROPOSED_BUDGET);
    expect(typeof applications[0]?.proposedBudget).toBe("string");
  });

  it.each([
    ["getAllContracts", () => storage.getAllContracts()],
    ["getContracts", () => storage.getContracts(CONTRACT_ROW.client_id)],
    ["getContractById", () => storage.getContractById(CONTRACT_ROW.id)],
    [
      "createContract",
      () =>
        storage.createContract({
          jobId: CONTRACT_ROW.job_id,
          clientId: CONTRACT_ROW.client_id,
          workerId: CONTRACT_ROW.worker_id,
          title: CONTRACT_ROW.title,
          description: CONTRACT_ROW.description,
          totalValue: BIGINT_CONTRACT_VALUE,
          status: "active",
          clientSigned: CONTRACT_ROW.client_signed,
          workerSigned: CONTRACT_ROW.worker_signed,
          startDate: CONTRACT_ROW.start_date.toISOString(),
          endDate: CONTRACT_ROW.end_date,
        }),
    ],
    [
      "updateContract",
      () =>
        storage.updateContract(
          CONTRACT_ROW.id,
           { totalValue: BIGINT_CONTRACT_VALUE },
        ),
    ],
  ])("normalizes BIGINT contract values returned by %s", async (_method, operation) => {
    poolMock.query.mockResolvedValueOnce({ rows: [CONTRACT_ROW] });

    const result = await operation();
    const contracts = Array.isArray(result) ? result : [result];

    expect(contracts[0]?.totalValue).toBe(BIGINT_CONTRACT_VALUE);
    expect(typeof contracts[0]?.totalValue).toBe("string");
  });

  it("preserves the PostgreSQL BIGINT maximum hourly rate when creating a profile", async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [PROFILE_ROW] });

    const profile = await storage.createProfile(PROFILE_INPUT);

    expect(profile.hourlyRate).toBe(BIGINT_MAX);
    expect(poolMock.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO profiles"),
      expect.arrayContaining([BIGINT_MAX]),
    );
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "9223372036854775808"])(
    "rejects invalid profile hourly rate %s before querying PostgreSQL",
    async (hourlyRate) => {
      await expect(
        storage.updateProfile(PROFILE_ROW.user_id, { hourlyRate } as any),
      ).rejects.toMatchObject({
        cause: {
          code: "INVALID_MONEY_DATA",
          field: "profiles.hourly_rate",
        },
      });
      expect(poolMock.query).not.toHaveBeenCalled();
    },
  );

  it("preserves a maximum BIGINT milestone amount on create", async () => {
    const row = {
      id: 71,
      contract_id: CONTRACT_ROW.id,
      title: "Serah terima",
      description: "Pembayaran akhir",
      amount: BIGINT_MAX,
      status: "in_progress",
      due_date: null,
      completed_at: null,
      notes: null,
    };
    clientMock.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ status: "active" }] })
      .mockResolvedValueOnce({ rows: [row] });

    const milestone = await storage.createMilestone({
      contractId: CONTRACT_ROW.id,
      title: row.title,
      description: row.description,
      amount: BIGINT_MAX,
      status: "in_progress",
      dueDate: null,
      completedAt: null,
      notes: null,
    });

    expect(milestone?.amount).toBe(BIGINT_MAX);
    expect(clientMock.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO milestones"),
      expect.arrayContaining([BIGINT_MAX]),
    );
  });

  it("aggregates revenue beyond the BIGINT column range without rounding", async () => {
    poolMock.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          { status: "completed", total_value: BIGINT_MAX },
          { status: "completed", total_value: BIGINT_MAX },
        ],
      });

    const analytics = await storage.getAnalytics();

    expect(analytics.totalRevenue).toBe("18446744073709551614");
  });
});

describe("storage dispute visibility", () => {
  beforeEach(async () => {
    await startupReady;
    vi.clearAllMocks();
    poolMock.query.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it("lists disputes through contract participation rather than only the raiser", async () => {
    await storage.getDisputes(CONTRACT_ROW.worker_id);

    expect(poolMock.query).toHaveBeenCalledWith(
      expect.stringContaining("JOIN contracts c ON c.id = d.contract_id"),
      [CONTRACT_ROW.worker_id],
    );
    expect(poolMock.query).toHaveBeenCalledWith(
      expect.stringContaining("c.client_id = $1 OR c.worker_id = $1"),
      [CONTRACT_ROW.worker_id],
    );
  });
});