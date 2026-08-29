import type { PGStore } from "connect-pg-simple";

export interface SessionPruningStore {
  pruneSessions(callback: (error: Error | null) => void): void;
}

export interface SessionPruner {
  stop(): void;
}

export interface SessionPrunerOptions {
  intervalMs: number;
  retryDelayMs: number;
  /**
   * Number of consecutive failures that constitute a pruning incident.
   * A warning is emitted once per incident.
   */
  warningThreshold: number;
  onError?: (error: Error) => void;
  onWarning?: (error: Error, consecutiveFailures: number) => void;
  onRecovery?: (consecutiveFailures: number) => void;
  onMonitoringEvent?: (event: SessionPruningMonitoringEvent) => void;
  schedule?: typeof setTimeout;
  cancel?: typeof clearTimeout;
}

export interface SessionPruningIncidentStartedEvent {
  type: "session_pruning_incident_started";
  incidentId: string;
  consecutiveFailures: number;
  errorMessage: string;
  occurredAt: string;
}

export interface SessionPruningIncidentRecoveredEvent {
  type: "session_pruning_incident_recovered";
  incidentId: string;
  consecutiveFailures: number;
  occurredAt: string;
}

export type SessionPruningMonitoringEvent =
  | SessionPruningIncidentStartedEvent
  | SessionPruningIncidentRecoveredEvent;

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;
const DEFAULT_RETRY_DELAY_MS = 60 * 1000;
const DEFAULT_WARNING_THRESHOLD = 3;
let incidentSequence = 0;

function createIncidentId(): string {
  incidentSequence += 1;
  return `session-pruning-${process.pid}-${incidentSequence}`;
}

function getErrorMessage(error: Error): string {
  return error.message || error.name || "unknown pruning error";
}

/**
 * Keeps expired-session cleanup alive when PostgreSQL has a transient outage.
 *
 * connect-pg-simple logs a prune error but only retries on its next regular
 * interval. We disable its timer and schedule the next attempt ourselves so a
 * temporary failure is retried promptly without creating overlapping timers.
 */
export function startSessionPruner(
  store: SessionPruningStore,
  options: Partial<SessionPrunerOptions> = {},
): SessionPruner {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const warningThreshold = Number.isFinite(options.warningThreshold) && options.warningThreshold > 0
    ? Math.ceil(options.warningThreshold)
    : DEFAULT_WARNING_THRESHOLD;
  const schedule = options.schedule ?? setTimeout;
  const cancel = options.cancel ?? clearTimeout;
  // Keep the per-attempt hook available to callers that need it, but do not
  // log every retry by default. The warning below groups a sustained outage
  // into one incident instead.
  const onError = options.onError;
  const onWarning = options.onWarning ?? ((error: Error, consecutiveFailures: number) => {
    console.warn(
      `[session-pruning] pruning has failed ${consecutiveFailures} consecutive times; ` +
      "expired sessions may be accumulating:",
      error,
    );
  });
  const onRecovery = options.onRecovery ?? ((consecutiveFailures: number) => {
    console.info(
      `[session-pruning] pruning recovered after ${consecutiveFailures} consecutive failures`,
    );
  });
  const onMonitoringEvent = options.onMonitoringEvent ?? ((event: SessionPruningMonitoringEvent) => {
    const log = event.type === "session_pruning_incident_started"
      ? console.error
      : console.info;
    log(`[session-pruning-monitor] ${JSON.stringify(event)}`);
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let consecutiveFailures = 0;
  let warningEmitted = false;
  let incidentId: string | undefined;

  const emitMonitoringEvent = (event: SessionPruningMonitoringEvent) => {
    try {
      onMonitoringEvent(event);
    } catch (monitoringError) {
      // A monitoring sink must never prevent the retry scheduler from
      // continuing to clean up sessions.
      console.error("[session-pruning] monitoring event failed:", monitoringError);
    }
  };

  const scheduleNext = (delayMs: number) => {
    if (stopped) return;

    if (timer) cancel(timer);
    timer = schedule(() => {
      timer = undefined;
      prune();
    }, delayMs);
    timer.unref?.();
  };

  const prune = () => {
    if (stopped) return;

    store.pruneSessions((error) => {
      if (stopped) return;

      if (error) {
        consecutiveFailures += 1;
        onError?.(error);
        if (!warningEmitted && consecutiveFailures >= warningThreshold) {
          warningEmitted = true;
          incidentId = createIncidentId();
          emitMonitoringEvent({
            type: "session_pruning_incident_started",
            incidentId,
            consecutiveFailures,
            errorMessage: getErrorMessage(error),
            occurredAt: new Date().toISOString(),
          });
          onWarning(error, consecutiveFailures);
        }
        scheduleNext(retryDelayMs);
      } else {
        if (warningEmitted) {
          emitMonitoringEvent({
            type: "session_pruning_incident_recovered",
            incidentId: incidentId!,
            consecutiveFailures,
            occurredAt: new Date().toISOString(),
          });
          onRecovery(consecutiveFailures);
        }
        consecutiveFailures = 0;
        warningEmitted = false;
        incidentId = undefined;
        scheduleNext(intervalMs);
      }
    });
  };

  scheduleNext(intervalMs);

  return {
    stop() {
      stopped = true;
      if (timer) {
        cancel(timer);
        timer = undefined;
      }
    },
  };
}

export type { PGStore };