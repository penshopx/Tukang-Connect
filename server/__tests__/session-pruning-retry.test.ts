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
    const onWarning = vi.fn();
    const onRecovery = vi.fn();
    const pruner = startSessionPruner(
      { pruneSessions },
      {
        intervalMs: 15 * 60 * 1000,
        retryDelayMs: 1_000,
        onError,
        onWarning,
        onRecovery,
      },
    );

    vi.advanceTimersByTime(15 * 60 * 1000);
    expect(pruneSessions).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onWarning).not.toHaveBeenCalled();

    vi.advanceTimersByTime(999);
    expect(pruneSessions).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(pruneSessions).toHaveBeenCalledTimes(2);
    expect(onWarning).not.toHaveBeenCalled();
    expect(onRecovery).not.toHaveBeenCalled();

    pruner.stop();
    vi.useRealTimers();
  });

  it("emits one warning for a sustained failure incident", () => {
    vi.useFakeTimers();

    const pruneSessions = vi.fn().mockImplementation(
      (callback: (error: Error | null) => void) => {
        callback(new Error("database unavailable"));
      },
    );
    const onWarning = vi.fn();
    const pruner = startSessionPruner(
      { pruneSessions },
      {
        intervalMs: 1_000,
        retryDelayMs: 100,
        onWarning,
      },
    );

    vi.advanceTimersByTime(1_000 + 100 * 2);
    expect(pruneSessions).toHaveBeenCalledTimes(3);
    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onWarning).toHaveBeenCalledWith(expect.any(Error), 3);

    vi.advanceTimersByTime(100 * 3);
    expect(pruneSessions).toHaveBeenCalledTimes(6);
    expect(onWarning).toHaveBeenCalledTimes(1);

    pruner.stop();
    vi.useRealTimers();
  });

  it("emits recovery once when pruning succeeds after a warning", () => {
    vi.useFakeTimers();

    const pruneSessions = vi
      .fn()
      .mockImplementationOnce((callback: (error: Error | null) => void) => {
        callback(new Error("database unavailable"));
      })
      .mockImplementationOnce((callback: (error: Error | null) => void) => {
        callback(new Error("database unavailable"));
      })
      .mockImplementationOnce((callback: (error: Error | null) => void) => {
        callback(new Error("database unavailable"));
      })
      .mockImplementationOnce((callback: (error: Error | null) => void) => {
        callback(null);
      })
      .mockImplementation((callback: (error: Error | null) => void) => {
        callback(null);
      });
    const onWarning = vi.fn();
    const onRecovery = vi.fn();
    const pruner = startSessionPruner(
      { pruneSessions },
      {
        intervalMs: 1_000,
        retryDelayMs: 100,
        onWarning,
        onRecovery,
      },
    );

    vi.advanceTimersByTime(1_000 + 100 * 3);
    expect(pruneSessions).toHaveBeenCalledTimes(4);
    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onRecovery).toHaveBeenCalledTimes(1);
    expect(onRecovery).toHaveBeenCalledWith(3);

    vi.advanceTimersByTime(999);
    expect(onRecovery).toHaveBeenCalledTimes(1);

    pruner.stop();
    vi.useRealTimers();
  });

  it("sends paired monitoring events once per sustained incident", () => {
    vi.useFakeTimers();

    let attempts = 0;
    const pruneSessions = vi.fn().mockImplementation(
      (callback: (error: Error | null) => void) => {
        attempts += 1;
        callback(attempts % 3 === 0 ? null : new Error("database unavailable"));
      },
    );
    const onMonitoringEvent = vi.fn();
    const pruner = startSessionPruner(
      { pruneSessions },
      {
        intervalMs: 1_000,
        retryDelayMs: 100,
        warningThreshold: 2,
        onWarning: vi.fn(),
        onRecovery: vi.fn(),
        onMonitoringEvent,
      },
    );

    vi.advanceTimersByTime(1_000 + 100 * 2 + 1_000 + 100 * 2);

    expect(onMonitoringEvent).toHaveBeenCalledTimes(4);
    expect(onMonitoringEvent).toHaveBeenNthCalledWith(1, {
      type: "session_pruning_incident_started",
      incidentId: expect.any(String),
      consecutiveFailures: 2,
      errorMessage: "database unavailable",
      occurredAt: expect.any(String),
    });
    expect(onMonitoringEvent).toHaveBeenNthCalledWith(2, {
      type: "session_pruning_incident_recovered",
      incidentId: expect.any(String),
      consecutiveFailures: 2,
      occurredAt: expect.any(String),
    });
    expect(onMonitoringEvent).toHaveBeenNthCalledWith(3, {
      type: "session_pruning_incident_started",
      incidentId: expect.any(String),
      consecutiveFailures: 2,
      errorMessage: "database unavailable",
      occurredAt: expect.any(String),
    });
    expect(onMonitoringEvent).toHaveBeenNthCalledWith(4, {
      type: "session_pruning_incident_recovered",
      incidentId: expect.any(String),
      consecutiveFailures: 2,
      occurredAt: expect.any(String),
    });

    const events = onMonitoringEvent.mock.calls.map(([event]) => event);
    expect(events[0].incidentId).toBe(events[1].incidentId);
    expect(events[2].incidentId).toBe(events[3].incidentId);
    expect(events[0].incidentId).not.toBe(events[2].incidentId);

    pruner.stop();
    vi.useRealTimers();
  });

  it("emits a new warning and recovery for a second incident after pruning recovers", () => {
    vi.useFakeTimers();

    const pruneSessions = vi
      .fn()
      .mockImplementationOnce((callback: (error: Error | null) => void) => {
        callback(new Error("database unavailable"));
      })
      .mockImplementationOnce((callback: (error: Error | null) => void) => {
        callback(new Error("database unavailable"));
      })
      .mockImplementationOnce((callback: (error: Error | null) => void) => {
        callback(new Error("database unavailable"));
      })
      .mockImplementationOnce((callback: (error: Error | null) => void) => {
        callback(null);
      })
      .mockImplementationOnce((callback: (error: Error | null) => void) => {
        callback(new Error("database unavailable"));
      })
      .mockImplementationOnce((callback: (error: Error | null) => void) => {
        callback(new Error("database unavailable"));
      })
      .mockImplementationOnce((callback: (error: Error | null) => void) => {
        callback(new Error("database unavailable"));
      })
      .mockImplementationOnce((callback: (error: Error | null) => void) => {
        callback(null);
      });
    const onWarning = vi.fn();
    const onRecovery = vi.fn();
    const pruner = startSessionPruner(
      { pruneSessions },
      {
        intervalMs: 1_000,
        retryDelayMs: 100,
        onWarning,
        onRecovery,
      },
    );

    vi.advanceTimersByTime(1_000 + 100 * 3);
    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onWarning).toHaveBeenCalledWith(expect.any(Error), 3);
    expect(onRecovery).toHaveBeenCalledTimes(1);
    expect(onRecovery).toHaveBeenCalledWith(3);

    vi.advanceTimersByTime(1_000 + 100 * 3);
    expect(pruneSessions).toHaveBeenCalledTimes(8);
    expect(onWarning).toHaveBeenCalledTimes(2);
    expect(onWarning).toHaveBeenNthCalledWith(2, expect.any(Error), 3);
    expect(onRecovery).toHaveBeenCalledTimes(2);
    expect(onRecovery).toHaveBeenNthCalledWith(2, 3);

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