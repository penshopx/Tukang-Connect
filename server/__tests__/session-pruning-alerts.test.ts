import { createServer } from "node:http";
import { describe, expect, it, vi } from "vitest";
import {
  createSessionPruningAlertNotifier,
  toAlertPayload,
  type SessionPruningAlertPayload,
} from "../sessionPruningAlerts.js";

const startedEvent = {
  type: "session_pruning_incident_started" as const,
  incidentId: "session-pruning-test-1",
  consecutiveFailures: 4,
  errorMessage: "database unavailable",
  occurredAt: "2026-08-29T15:00:00.000Z",
};

const recoveredEvent = {
  type: "session_pruning_incident_recovered" as const,
  incidentId: startedEvent.incidentId,
  consecutiveFailures: startedEvent.consecutiveFailures,
  occurredAt: "2026-08-29T15:01:00.000Z",
};

describe("session pruning alert notifier", () => {
  it("maps start and recovery events to a matching alert lifecycle", () => {
    const firing = toAlertPayload(startedEvent);
    const resolved = toAlertPayload(recoveredEvent);

    expect(firing).toMatchObject({
      alert: "SESSION_PRUNING_UNAVAILABLE",
      status: "firing",
      incidentId: startedEvent.incidentId,
      consecutiveFailures: 4,
      failureCount: 4,
      errorMessage: "database unavailable",
    });
    expect(resolved).toMatchObject({
      alert: "SESSION_PRUNING_UNAVAILABLE",
      status: "resolved",
      incidentId: startedEvent.incidentId,
      consecutiveFailures: 4,
      failureCount: 4,
    });
  });

  it("serializes firing and recovery deliveries", async () => {
    const deliveries: SessionPruningAlertPayload[] = [];
    const send = vi.fn(async (_url: string, payload: SessionPruningAlertPayload) => {
      deliveries.push(payload);
    });
    const notifier = createSessionPruningAlertNotifier({
      webhookUrl: "https://alerts.example.test/session-pruning",
      send,
    });

    notifier.notify(startedEvent);
    notifier.notify(recoveredEvent);
    await notifier.flush();

    expect(send).toHaveBeenCalledTimes(2);
    expect(deliveries.map(({ status, incidentId, failureCount }) => ({
      status,
      incidentId,
      failureCount,
    }))).toEqual([
      { status: "firing", incidentId: startedEvent.incidentId, failureCount: 4 },
      { status: "resolved", incidentId: startedEvent.incidentId, failureCount: 4 },
    ]);
  });

  it("keeps pruning independent when delivery fails", async () => {
    const onDeliveryError = vi.fn();
    const notifier = createSessionPruningAlertNotifier({
      webhookUrl: "https://alerts.example.test/session-pruning",
      send: vi.fn().mockRejectedValue(new Error("network unavailable")),
      onDeliveryError,
    });

    notifier.notify(startedEvent);
    await notifier.flush();

    expect(onDeliveryError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        incidentId: startedEvent.incidentId,
        failureCount: startedEvent.consecutiveFailures,
      }),
    );
  });

  it("posts the complete lifecycle to a local webhook without a database", async () => {
    const received: SessionPruningAlertPayload[] = [];
    const server = createServer((request, response) => {
      let body = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        body += chunk;
      });
      request.on("end", () => {
        received.push(JSON.parse(body));
        response.writeHead(204);
        response.end();
      });
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close();
      throw new Error("local webhook did not bind to a TCP port");
    }

    try {
      const notifier = createSessionPruningAlertNotifier({
        webhookUrl: `http://127.0.0.1:${address.port}/session-pruning`,
      });

      notifier.notify(startedEvent);
      notifier.notify(recoveredEvent);
      await notifier.flush();

      expect(received).toHaveLength(2);
      expect(received.map(({ status, incidentId, failureCount }) => ({
        status,
        incidentId,
        failureCount,
      }))).toEqual([
        { status: "firing", incidentId: startedEvent.incidentId, failureCount: 4 },
        { status: "resolved", incidentId: startedEvent.incidentId, failureCount: 4 },
      ]);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    }
  });

  it("does not call a sender when the webhook is not configured", async () => {
    const send = vi.fn();
    const notifier = createSessionPruningAlertNotifier({ send });

    notifier.notify(startedEvent);
    await notifier.flush();

    expect(send).not.toHaveBeenCalled();
  });
});