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

const BIGINT_BUDGET = "900000000000000";
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

describe("storage job budget normalization", () => {
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
          budget: Number(BIGINT_BUDGET),
          location: JOB_ROW.location,
          status: "open",
          clientId: JOB_ROW.client_id,
          workerId: null,
          deadline: JOB_ROW.deadline.toISOString(),
        }),
    ],
    [
      "updateJob",
      () => storage.updateJob(JOB_ROW.id, { budget: Number(BIGINT_BUDGET) }),
    ],
  ])("normalizes BIGINT budget values returned by %s", async (_method, operation) => {
    poolMock.query.mockResolvedValueOnce({ rows: [JOB_ROW] });

    const result = await operation();
    const jobs = Array.isArray(result) ? result : [result];

    expect(jobs[0]?.budget).toBe(Number(BIGINT_BUDGET));
    expect(typeof jobs[0]?.budget).toBe("number");
  });
});