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

describe("storage.updateUserRole", () => {
  beforeEach(async () => {
    await startupReady;
    vi.clearAllMocks();
    clientMock.query.mockResolvedValue({ rows: [], rowCount: 0 });
    poolMock.query.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it("withdraws pending applications in the same transaction as the role change", async () => {
    clientMock.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 3 }) // withdraw applications
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // update role
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const withdrawn = await storage.updateUserRole(7, "pelanggan");

    expect(withdrawn).toBe(3);
    expect(clientMock.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(clientMock.query).toHaveBeenNthCalledWith(
      2,
      "UPDATE job_applications SET status = 'withdrawn' WHERE applicant_id = $1 AND status = 'pending'",
      [7]
    );
    expect(clientMock.query).toHaveBeenNthCalledWith(
      3,
      "UPDATE users SET role = $1 WHERE id = $2",
      ["pelanggan", 7]
    );
    expect(clientMock.query).toHaveBeenNthCalledWith(4, "COMMIT");
  });

  it("changes to tukang without changing applications", async () => {
    clientMock.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // update role
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const withdrawn = await storage.updateUserRole(7, "tukang");

    expect(withdrawn).toBe(0);
    expect(clientMock.query).toHaveBeenCalledTimes(3);
    expect(clientMock.query).toHaveBeenNthCalledWith(
      2,
      "UPDATE users SET role = $1 WHERE id = $2",
      ["tukang", 7]
    );
  });

  it("rolls back the role change if withdrawing applications fails", async () => {
    const failure = new Error("database unavailable");
    clientMock.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockRejectedValueOnce(failure) // withdraw applications
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // ROLLBACK

    await expect(storage.updateUserRole(7, "pelanggan")).rejects.toThrow(
      "Storage operation failed: updateUserRole"
    );
    expect(clientMock.query).toHaveBeenNthCalledWith(3, "ROLLBACK");
    expect(clientMock.query).not.toHaveBeenCalledWith(
      "UPDATE users SET role = $1 WHERE id = $2",
      ["pelanggan", 7]
    );
  });
});