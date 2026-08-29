import { describe, expect, it, vi } from "vitest";
import { startSessionPruner } from "../sessionPruning.js";

describe("session pruning retry scheduler", () => {
  it("retries after a transient database failure", () => {
    vi.useFakeTimers();

    const pruneSessions = vi
      .fn()
      .mockImplementationOnce((callback: (error: Error | null) => void) => {
        callback(new Error("database temporarily unavailable"));
      })
      .mockImplementationOnce((callback: (error: Error | null) => void) => {
        callback(null);
      });
    const onError = vi.fn();
    const pruner = startSessionPruner(
      { pruneSessions },
      {
        intervalMs: 15 * 60 * 1000,
        retryDelayMs: 1_000,
        onError,
      },
    );

    vi.advanceTimersByTime(15 * 60 * 1000);
    expect(pruneSessions).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(999);
    expect(pruneSessions).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(pruneSessions).toHaveBeenCalledTimes(2);

    pruner.stop();
    vi.useRealTimers();
  });

  it("does not schedule another attempt after being stopped", () => {
    vi.useFakeTimers();

    const pruneSessions = vi.fn();
    const pruner = startSessionPruner(
      { pruneSessions },
      { intervalMs: 1_000, retryDelayMs: 100 },
    );

    pruner.stop();
    vi.advanceTimersByTime(2_000);

    expect(pruneSessions).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});