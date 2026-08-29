import { describe, expect, it, vi } from "vitest";

vi.mock("../storage.js", () => ({
  pool: { on: vi.fn() },
  storage: new Proxy({}, { get: () => vi.fn() }),
  withTransaction: vi.fn(),
  contractFromRow: vi.fn(),
}));

import { getSessionOptions } from "../app.js";

describe("production session configuration", () => {
  it("requires an explicit session secret in production", () => {
    expect(() => getSessionOptions(undefined, "production", "")).toThrow(
      "SESSION_SECRET must be configured in production",
    );
    expect(() => getSessionOptions(undefined, "production", "   ")).toThrow(
      "SESSION_SECRET must be configured in production",
    );
  });

  it("uses secure proxy-aware cookies in production", () => {
    const options = getSessionOptions(undefined, "production", "configured-test-secret");

    expect(options.secret).toBe("configured-test-secret");
    expect(options.proxy).toBe(true);
    expect(options.cookie).toMatchObject({
      secure: true,
      httpOnly: true,
      sameSite: "lax",
    });
  });

  it("keeps a non-production fallback for local and test runs only", () => {
    const options = getSessionOptions(undefined, "development", "");

    expect(options.secret).toBe("development-only-session-secret");
    expect(options.proxy).toBe(false);
    expect(options.cookie).toMatchObject({
      secure: false,
      httpOnly: true,
      sameSite: "lax",
    });
  });
});