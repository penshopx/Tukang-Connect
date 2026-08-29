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
      "SESSION_SECRET must be set to at least 32 characters in production",
    );
    expect(() => getSessionOptions(undefined, "production", "   ")).toThrow(
      "SESSION_SECRET must be set to at least 32 characters in production",
    );
    expect(() => getSessionOptions(undefined, "production", "too-short")).toThrow(
      "SESSION_SECRET must be set to at least 32 characters in production",
    );
  });

  it("uses secure proxy-aware cookies in production", () => {
    const configuredSecret = "s".repeat(32);
    const options = getSessionOptions(undefined, "production", configuredSecret);

    expect(options.secret).toBe(configuredSecret);
    expect(options.proxy).toBe(true);
    expect(options.cookie).toMatchObject({
      secure: true,
      httpOnly: true,
      sameSite: "lax",
    });
  });

  it("keeps a non-production fallback for local and test runs only", () => {
    const options = getSessionOptions(undefined, "development", "");

    expect(options.secret).toEqual(expect.any(String));
    expect(options.secret).toHaveLength(64);
    expect(options.proxy).toBe(false);
    expect(options.cookie).toMatchObject({
      secure: false,
      httpOnly: true,
      sameSite: "lax",
    });
  });
});