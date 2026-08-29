import { describe, expect, it } from "vitest";
import {
  addMoney,
  canonicalMoneyInput,
  compareMoney,
  compareNullableMoney,
  dailyRate,
  formatCurrency,
  multiplyMoney,
  scaleMoney,
} from "./utils";

describe("client exact monetary utilities", () => {
  const max = "9223372036854775807";

  it("validates the full PostgreSQL BIGINT range as decimal strings", () => {
    expect(canonicalMoneyInput(max)).toBe(max);
    expect(() => canonicalMoneyInput("9223372036854775808")).toThrow();
    expect(() => canonicalMoneyInput("1.5")).toThrow();
  });

  it("aggregates, scales, multiplies, and compares without number conversion", () => {
    expect(addMoney(max, max)).toBe(18446744073709551614n);
    expect(multiplyMoney("9007199254740993", 22)).toBe(198158383604301846n);
    expect(scaleMoney(max, 135, 100)).toBe(12451552249753947339n);
    expect(compareMoney(max, "9007199254740993")).toBe(1);
  });

  it("formats every digit of the maximum value", () => {
    expect(formatCurrency(max)).toContain("9.223.372.036.854.775.807");
  });

  it("orders adjacent large rates exactly and keeps missing rates last", () => {
    const lower = "9007199254740992";
    const higher = "9007199254740993";

    expect(compareNullableMoney(lower, higher, "asc")).toBe(-1);
    expect(compareNullableMoney(lower, higher, "desc")).toBe(1);
    expect(compareNullableMoney(null, higher, "asc")).toBe(1);
  });

  it("derives an eight-hour rate without coercing the hourly string", () => {
    expect(dailyRate("9007199254740993")).toBe(72057594037927944n);
    expect(formatCurrency(dailyRate(max))).toContain("73.786.976.294.838.206.456");
  });
});