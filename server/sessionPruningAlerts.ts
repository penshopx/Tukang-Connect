import type { SessionPruningMonitoringEvent } from "./sessionPruning.js";

export interface SessionPruningAlertPayload {
  alert: "SESSION_PRUNING_UNAVAILABLE";
  status: "firing" | "resolved";
  source: "kerja-proyek";
  incidentId: string;
  consecutiveFailures: number;
  failureCount: number;
  occurredAt: string;
  errorMessage?: string;
  summary: string;
}

export type SessionPruningAlertSender = (
  webhookUrl: string,
  payload: SessionPruningAlertPayload,
) => Promise<void>;

export interface SessionPruningAlertNotifier {
  notify(event: SessionPruningMonitoringEvent): void;
  flush(): Promise<void>;
}

export interface SessionPruningAlertNotifierOptions {
  webhookUrl?: string;
  send?: SessionPruningAlertSender;
  onDeliveryError?: (
    error: unknown,
    payload: SessionPruningAlertPayload,
  ) => void;
}

const WEBHOOK_TIMEOUT_MS = 10_000;

async function sendToWebhook(
  webhookUrl: string,
  payload: SessionPruningAlertPayload,
): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`alert webhook returned HTTP ${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

function toAlertPayload(
  event: SessionPruningMonitoringEvent,
): SessionPruningAlertPayload {
  const isStarted = event.type === "session_pruning_incident_started";
  const failureCount = event.consecutiveFailures;

  return {
    alert: "SESSION_PRUNING_UNAVAILABLE",
    status: isStarted ? "firing" : "resolved",
    source: "kerja-proyek",
    incidentId: event.incidentId,
    consecutiveFailures: failureCount,
    failureCount,
    occurredAt: event.occurredAt,
    ...(isStarted ? { errorMessage: event.errorMessage } : {}),
    summary: isStarted
      ? `Pembersihan sesi gagal ${failureCount} kali berturut-turut`
      : `Pembersihan sesi pulih setelah ${failureCount} kegagalan berturut-turut`,
  };
}

/**
 * Delivers incident lifecycle events without blocking session cleanup.
 *
 * Events are serialized so a recovery notification cannot overtake the
 * incident-start notification when the webhook is slow. Delivery failures are
 * reported to the structured application log, while pruning retries continue.
 */
export function createSessionPruningAlertNotifier(
  options: SessionPruningAlertNotifierOptions = {},
): SessionPruningAlertNotifier {
  const webhookUrl = options.webhookUrl ?? process.env.SESSION_PRUNING_ALERT_WEBHOOK_URL;
  const send = options.send ?? sendToWebhook;
  const onDeliveryError = options.onDeliveryError ?? ((error, payload) => {
    console.error("[session-pruning-alert] delivery failed:", {
      alert: payload.alert,
      status: payload.status,
      incidentId: payload.incidentId,
      failureCount: payload.failureCount,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  let deliveryChain = Promise.resolve();

  return {
    notify(event) {
      if (!webhookUrl) return;

      const payload = toAlertPayload(event);
      deliveryChain = deliveryChain
        .then(() => send(webhookUrl, payload))
        .catch((error: unknown) => {
          onDeliveryError(error, payload);
        });
    },
    flush() {
      return deliveryChain;
    },
  };
}

export { toAlertPayload };