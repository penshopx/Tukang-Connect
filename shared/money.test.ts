import { describe, expect, it } from "vitest";
import {
  PG_BIGINT_MAX,
  addMoney,
  canonicalMoney,
  compareMoney,
  formatIdrInteger,
  multiplyMoney,
  scaleMoney,
} from "./money.js";

describe("exact monetary helpers", () => {
  it("accepts and formats the PostgreSQL BIGINT maximum exactly", () => {
    const max = PG_BIGINT_MAX.toString();

    expect(canonicalMoney(max)).toBe(max);
    expect(formatIdrInteger(max)).toBe("9.223.372.036.854.775.807");
  });

  it("rejects overflow and already-imprecise numeric input", () => {
    expect(() => canonicalMoney("9223372036854775808")).toThrow();
    expect(() => canonicalMoney(Number.MAX_SAFE_INTEGER + 1)).toThrow();
  });

  it("keeps aggregate, comparison, multiplication, and scaling exact", () => {
    const max = PG_BIGINT_MAX.toString();

    expect(addMoney(max, max)).toBe("18446744073709551614");
    expect(compareMoney(max, "9007199254740993")).toBe(1);
    expect(multiplyMoney("9007199254740993", 5)).toBe("45035996273704965");
    expect(scaleMoney(max, 35, 100)).toBe("3228180212899171532");
  });
});