import type { PGStore } from "connect-pg-simple";

export interface SessionPruningStore {
  pruneSessions(callback: (error: Error | null) => void): void;
}

export interface SessionPruner {
  stop(): void;
}

interface SessionPrunerOptions {
  intervalMs: number;
  retryDelayMs: number;
  onError?: (error: Error) => void;
  schedule?: typeof setTimeout;
  cancel?: typeof clearTimeout;
}

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;
const DEFAULT_RETRY_DELAY_MS = 60 * 1000;

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
  const schedule = options.schedule ?? setTimeout;
  const cancel = options.cancel ?? clearTimeout;
  const onError = options.onError ?? ((error: Error) => {
    console.error("[session-pruning] failed to prune expired sessions:", error);
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

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
        onError(error);
        scheduleNext(retryDelayMs);
      } else {
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