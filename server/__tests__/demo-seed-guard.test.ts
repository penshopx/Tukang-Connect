import { afterEach, expect, it, vi } from "vitest";

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

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.clearAllMocks();
});

it("skips demo database seeding outside development", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.resetModules();

  const { startupReady } = await import("../storage.js");
  await startupReady;

  expect(poolMock.query).not.toHaveBeenCalledWith(
    "SELECT id FROM seed_status WHERE id = 1",
  );
  expect(poolMock.connect).not.toHaveBeenCalled();
});

it("seeds demo data in development", async () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.resetModules();

  const { startupReady } = await import("../storage.js");
  await startupReady;

  expect(poolMock.query).toHaveBeenCalledWith(
    "SELECT id FROM seed_status WHERE id = 1",
  );
  expect(poolMock.connect).toHaveBeenCalledOnce();
  expect(clientMock.query).toHaveBeenCalledWith(
    expect.stringContaining("INSERT INTO users"),
    expect.any(Array),
  );
});
