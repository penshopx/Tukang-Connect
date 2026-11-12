import { beforeEach, describe, expect, it, vi } from "vitest";

const { poolMock, clientMock } = vi.hoisted(() => {
  const client = {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: vi.fn(),
  };
  return {
    clientMock: client,
    poolMock: {
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      connect: vi.fn().mockResolvedValue(client),
      on: vi.fn(),
    },
  };
});

vi.mock("pg", () => ({
  default: {
    Pool: function Pool() {
      return poolMock;
    },
  },
}));

import { startupReady, storage } from "../storage.js";

const REVIEW = {
  id: 51,
  reviewer_id: 11,
  reviewee_id: 13,
  job_id: 21,
  rating: 5,
  comment: "Pekerjaan selesai dengan baik",
  created_at: new Date("2024-02-01T00:00:00.000Z"),
};

const REVIEW_INPUT = {
  reviewerId: REVIEW.reviewer_id,
  revieweeId: REVIEW.reviewee_id,
  jobId: REVIEW.job_id,
  rating: REVIEW.rating,
  comment: REVIEW.comment,
};

describe("storage.createReview", () => {
  beforeEach(async () => {
    await startupReady;
    vi.clearAllMocks();
    poolMock.query.mockResolvedValue({ rows: [], rowCount: 0 });
    clientMock.query.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it("locks and verifies the completed contract before inserting", async () => {
    clientMock.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 31 }], rowCount: 1 }) // completed contract
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // no existing review
      .mockResolvedValueOnce({ rows: [REVIEW], rowCount: 1 }) // insert
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const result = await storage.createReview(REVIEW_INPUT);

    expect(result).toEqual({
      status: "created",
      review: {
        id: REVIEW.id,
        reviewerId: REVIEW.reviewer_id,
        revieweeId: REVIEW.reviewee_id,
        jobId: REVIEW.job_id,
        rating: REVIEW.rating,
        comment: REVIEW.comment,
        createdAt: REVIEW.created_at.toISOString(),
      },
    });
    expect(clientMock.query.mock.calls[1][0]).toContain("FOR UPDATE");
    expect(clientMock.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("status = 'completed'"),
      [REVIEW.job_id, REVIEW.reviewer_id, REVIEW.reviewee_id],
    );
    expect(clientMock.query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("INSERT INTO reviews"),
      [
        REVIEW.reviewer_id,
        REVIEW.reviewee_id,
        REVIEW.job_id,
        REVIEW.rating,
        REVIEW.comment,
      ],
    );
  });

  it("does not insert a second review for the same job", async () => {
    clientMock.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 31 }], rowCount: 1 }) // completed contract
      .mockResolvedValueOnce({ rows: [{ id: REVIEW.id }], rowCount: 1 }) // existing review
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const result = await storage.createReview(REVIEW_INPUT);

    expect(result).toEqual({ status: "already_reviewed" });
    expect(clientMock.query).toHaveBeenCalledTimes(4);
    expect(clientMock.query).not.toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO reviews"),
      expect.anything(),
    );
  });

  it("does not insert when no matching completed contract exists", async () => {
    clientMock.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // no completed contract
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const result = await storage.createReview(REVIEW_INPUT);

    expect(result).toEqual({ status: "not_eligible" });
    expect(clientMock.query).toHaveBeenCalledTimes(3);
    expect(clientMock.query).not.toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO reviews"),
      expect.anything(),
    );
  });
});

describe("storage.getJobs public deadline filtering", () => {
  beforeEach(async () => {
    await startupReady;
    vi.clearAllMocks();
    poolMock.query.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it("excludes expired open jobs from public listings", async () => {
    await storage.getJobs({ status: "open" });

    expect(poolMock.query).toHaveBeenCalledWith(
      expect.stringContaining("deadline >= CURRENT_DATE"),
      ["open"],
    );
  });

  it("keeps expired jobs visible to their owners for project history", async () => {
    await storage.getJobs({ clientId: 11 });

    expect(poolMock.query).toHaveBeenCalledWith(
      expect.not.stringContaining("deadline >= CURRENT_DATE"),
      [11],
    );
  });
});
