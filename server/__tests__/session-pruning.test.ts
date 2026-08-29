/**
 * PostgreSQL session pruning integration test.
 *
 * This deliberately uses connect-pg-simple's real PGStore and a real
 * PostgreSQL table instead of the in-memory session store used by route tests.
 * That keeps the test focused on the database behavior that can regress after
 * a store configuration or dependency upgrade.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { startSessionPruner } from "../sessionPruning.js";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5_000,
});

const tableName = `session_prune_${process.pid}_${randomUUID().replaceAll("-", "")}`;
const PGStore = connectPgSimple(session);
let store: InstanceType<typeof PGStore> | undefined;

function setSession(
  targetStore: InstanceType<typeof PGStore>,
  sid: string,
  sessionData: session.SessionData,
): Promise<void> {
  return new Promise((resolve, reject) => {
    targetStore.set(sid, sessionData, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function pruneSessions(targetStore = store!): Promise<void> {
  return new Promise((resolve, reject) => {
    targetStore.pruneSessions((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

describe("PostgreSQL session pruning", () => {
  const expiredSid = `expired-${randomUUID()}`;

  beforeAll(async () => {
    store = new PGStore({
      pool,
      tableName,
      // Create the isolated table below so the package's fixed
      // "session_pkey" constraint name cannot collide with another test table.
      createTableIfMissing: false,
      // The test invokes pruneSessions directly; production scheduling is
      // covered separately by the retry-aware pruner test.
      pruneSessionInterval: false,
    });

    await pool.query(`
      CREATE TABLE "${tableName}" (
        "sid" varchar NOT NULL PRIMARY KEY,
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      )
    `);
    await pool.query(
      `CREATE INDEX "${tableName}_expire_idx" ON "${tableName}" ("expire")`,
    );

    await setSession(store, expiredSid, {
      cookie: {
        originalMaxAge: null,
        expires: new Date(Date.now() - 60_000),
      } as session.Cookie,
    });
  });

  afterAll(async () => {
    await store?.close();
    await pool.query(`DROP TABLE IF EXISTS "${tableName}"`);
    await pool.end();
  });

  it("deletes an expired session row when pruning runs", async () => {
    const beforePrune = await pool.query(
      `SELECT sid FROM "${tableName}" WHERE sid = $1`,
      [expiredSid],
    );
    expect(beforePrune.rowCount).toBe(1);

    await pruneSessions();

    const afterPrune = await pool.query(
      `SELECT sid FROM "${tableName}" WHERE sid = $1`,
      [expiredSid],
    );
    expect(afterPrune.rowCount).toBe(0);
  });

  it("retries a failed delete and removes the expired session", async () => {
    const retryExpiredSid = `expired-retry-${randomUUID()}`;
    let shouldFailFirstPrune = true;
    const flakyPool = {
      query(query: string, params?: unknown[]) {
        if (shouldFailFirstPrune && query.startsWith("DELETE FROM")) {
          shouldFailFirstPrune = false;
          return Promise.reject(new Error("database temporarily unavailable"));
        }

        return pool.query(query, params);
      },
    } as unknown as pg.Pool;
    const retryStore = new PGStore({
      pool: flakyPool,
      tableName,
      createTableIfMissing: false,
      pruneSessionInterval: false,
    });

    await setSession(retryStore, retryExpiredSid, {
      cookie: {
        originalMaxAge: null,
        expires: new Date(Date.now() - 60_000),
      } as session.Cookie,
    });

    const onError = vi.fn();
    vi.useFakeTimers();
    const pruner = startSessionPruner(retryStore, {
      intervalMs: 15 * 60 * 1000,
      retryDelayMs: 1_000,
      onError,
    });

    try {
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
      expect(onError).toHaveBeenCalledTimes(1);

      const afterFailedPrune = await pool.query(
        `SELECT sid FROM "${tableName}" WHERE sid = $1`,
        [retryExpiredSid],
      );
      expect(afterFailedPrune.rowCount).toBe(1);

      await vi.advanceTimersByTimeAsync(999);
      expect(onError).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      const afterRetry = await pool.query(
        `SELECT sid FROM "${tableName}" WHERE sid = $1`,
        [retryExpiredSid],
      );
      expect(afterRetry.rowCount).toBe(0);
    } finally {
      pruner.stop();
      vi.useRealTimers();
      await retryStore.close();
    }
  });
});