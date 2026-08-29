/**
 * PostgreSQL session pruning integration test.
 *
 * This deliberately uses connect-pg-simple's real PGStore and a real
 * PostgreSQL table instead of the in-memory session store used by route tests.
 * That keeps the test focused on the database behavior that can regress after
 * a store configuration or dependency upgrade.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { randomUUID } from "node:crypto";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5_000,
});

const tableName = `session_prune_${process.pid}_${randomUUID().replaceAll("-", "")}`;
const PGStore = connectPgSimple(session);
let store: InstanceType<typeof PGStore> | undefined;

function setSession(sid: string, sessionData: session.SessionData): Promise<void> {
  return new Promise((resolve, reject) => {
    store!.set(sid, sessionData, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function pruneSessions(): Promise<void> {
  return new Promise((resolve, reject) => {
    store!.pruneSessions((error) => {
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
      // Match the production configuration so the timer is enabled. The test
      // invokes pruneSessions directly to avoid waiting 15 minutes.
      pruneSessionInterval: 15 * 60,
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

    await setSession(expiredSid, {
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
});