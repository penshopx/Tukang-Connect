/**
 * Real PostgreSQL + HTTP regression tests. Each run uses a private schema;
 * no application tables or existing user data are modified.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type pg from "pg";
import type { Express } from "express";

const { schema } = vi.hoisted(() => ({
  schema: `contract_race_${Date.now()}_${Math.random().toString(36).slice(2)}`,
}));

// The actual storage implementation and its transactions use real connections,
// but their unqualified table names are confined to this test's schema.
vi.mock("pg", async () => {
  const actual = await vi.importActual<typeof import("pg")>("pg");
  return {
    ...actual,
    default: {
      ...actual.default,
      Pool: class extends actual.default.Pool {
        constructor(config: pg.PoolConfig) {
          super({ ...config, options: `-c search_path=${schema}`, application_name: schema });
        }
      },
    },
  };
});

let adminPool: pg.Pool;
let database: typeof import("../storage.js");
let app: Express;
let agent: ReturnType<typeof request.agent>;

const milestonePayload = {
  title: "Pekerjaan tambahan",
  description: "Milestone dari permintaan bersamaan",
  amount: "100000",
};

async function waitForBlockedTransaction() {
  // Observe an actual row-lock wait, rather than relying on arbitrary sleeps
  // or merely firing Promise.all and hoping the requests overlap.
  await vi.waitFor(async () => {
    const result = await adminPool.query(
      `SELECT 1 FROM pg_stat_activity
       WHERE pid <> pg_backend_pid()
         AND wait_event_type = 'Lock'
         AND application_name = $2
         AND query LIKE 'SELECT status FROM contracts WHERE id = $1 FOR UPDATE'
         AND $1 = ANY(pg_blocking_pids(pid))`,
      [blockerPid, schema],
    );
    expect(result.rowCount).toBeGreaterThan(0);
  }, { timeout: 4000, interval: 10 });
}

let blockerPid: number;

beforeAll(async () => {
  const realPg = await vi.importActual<typeof import("pg")>("pg");
  adminPool = new realPg.default.Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });
  await adminPool.query(`CREATE SCHEMA "${schema}"`);
  await adminPool.query(`
    SET search_path = "${schema}";
    CREATE TABLE seed_status (id integer PRIMARY KEY);
    INSERT INTO seed_status VALUES (1);
    CREATE TABLE users (
      id integer PRIMARY KEY, username text, email text, password text,
      role text, full_name text, created_at timestamptz DEFAULT now(),
      onboarding_completed boolean DEFAULT true, replit_id text
    );
    CREATE TABLE jobs (id integer PRIMARY KEY, title text, budget bigint, status text);
    CREATE TABLE profiles (user_id integer PRIMARY KEY, completed_projects integer NOT NULL DEFAULT 0);
    CREATE TABLE contracts (
      id integer PRIMARY KEY, job_id integer, client_id integer, worker_id integer,
      title text, description text, total_value bigint, status text,
      client_signed boolean, worker_signed boolean,
      created_at timestamptz DEFAULT now(), start_date timestamptz, end_date timestamptz
    );
    CREATE TABLE milestones (
      id serial PRIMARY KEY, contract_id integer REFERENCES contracts(id),
      title text, description text, amount bigint, status text,
      due_date timestamptz, completed_at timestamptz, notes text
    );
    CREATE TABLE notifications (
      id serial PRIMARY KEY, user_id integer, title text, message text, type text,
      is_read boolean, created_at timestamptz DEFAULT now(), link text
    );
  `);
  database = await import("../storage.js");
  await database.startupReady;
  ({ app } = await import("../app.js"));
});

beforeEach(async () => {
  await database.pool.query(`
    TRUNCATE milestones, contracts, jobs, profiles, users, notifications RESTART IDENTITY CASCADE;
    INSERT INTO users (id, username, email, password, role, full_name)
    VALUES (11, 'race-client', 'race-client@example.com',
      '$2b$10$7f/XLgajP4pD7TTgfLU6ueHcZTJZ6EtggkRFH.PtWgfaUaNzNDJey', 'pelanggan', 'Race Client'),
      (13, 'race-worker', 'race-worker@example.com', '', 'tukang', 'Race Worker');
    INSERT INTO jobs VALUES (21, 'Race project', 1000000, 'in_progress');
    INSERT INTO profiles VALUES (13, 0);
    INSERT INTO contracts (id, job_id, client_id, worker_id, total_value, status)
    VALUES (31, 21, 11, 13, 1000000, 'active');
  `);
  agent = request.agent(app);
  const response = await agent.post("/api/login").send({
    email: "race-client@example.com", password: "pass123",
  });
  expect(response.status).toBe(200);
});

afterAll(async () => {
  await database?.pool.end();
  if (adminPool) {
    await adminPool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await adminPool.end();
  }
});

describe("milestone creation racing contract completion", () => {
  it.each(["creation", "completion"] as const)(
    "serializes concurrent HTTP requests when %s gets the lock first",
    async (first) => {
      const blocker = await database.pool.connect();
      let pending: Promise<request.Response>[] = [];
      try {
        await blocker.query("BEGIN");
        blockerPid = (await blocker.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
        await blocker.query("SELECT status FROM contracts WHERE id = $1 FOR UPDATE", [31]);

        const create = () => agent.post("/api/contracts/31/milestones")
          .send(milestonePayload).then((response) => response);
        const complete = () => agent.post("/api/contracts/31/complete")
          .then((response) => response);

        pending.push(first === "creation" ? create() : complete());
        await waitForBlockedTransaction();
        pending.push(first === "creation" ? complete() : create());
        // Both requests must have reached the database before releasing the
        // parent lock. PostgreSQL grants these conflicting locks in queue order.
        await vi.waitFor(async () => {
          const waiting = await adminPool.query(
            `SELECT count(*)::integer AS count FROM pg_stat_activity
             WHERE wait_event_type = 'Lock'
               AND query LIKE 'SELECT status FROM contracts WHERE id = $1 FOR UPDATE'
               AND application_name = $1`,
            [schema],
          );
          expect(waiting.rows[0].count).toBeGreaterThanOrEqual(2);
        }, { timeout: 4000, interval: 10 });
        await blocker.query("COMMIT");

        const [firstResponse, secondResponse] = await Promise.all(pending);
        expect(firstResponse.status).toBe(first === "creation" ? 201 : 200);
        expect(secondResponse.status).toBe(409);
        const contract = await database.storage.getContractById(31);
        const milestones = await database.storage.getMilestonesByContract(31);
        expect(contract?.status).toBe(first === "creation" ? "active" : "completed");
        expect(milestones).toHaveLength(first === "creation" ? 1 : 0);
        const job = await database.pool.query("SELECT status FROM jobs WHERE id = 21");
        const profile = await database.pool.query("SELECT completed_projects FROM profiles WHERE user_id = 13");
        const notifications = await database.pool.query("SELECT * FROM notifications");
        expect(job.rows[0].status).toBe(first === "creation" ? "in_progress" : "completed");
        expect(profile.rows[0].completed_projects).toBe(first === "creation" ? 0 : 1);
        expect(notifications.rowCount).toBe(first === "creation" ? 0 : 2);
      } finally {
        await blocker.query("ROLLBACK");
        blocker.release();
        await Promise.allSettled(pending);
      }
    },
  );

  it("increments completion statistics only once for two concurrent completion requests", async () => {
    const responses = await Promise.all([
      agent.post("/api/contracts/31/complete"),
      agent.post("/api/contracts/31/complete"),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    const profile = await database.pool.query("SELECT completed_projects FROM profiles WHERE user_id = 13");
    expect(profile.rows[0].completed_projects).toBe(1);
  });

  it.each(["completed", "cancelled", "draft"])(
    "rejects milestone creation in storage when the contract is %s",
    async (status) => {
      await database.pool.query("UPDATE contracts SET status = $1 WHERE id = 31", [status]);
      const result = await database.storage.createMilestone({
        ...milestonePayload,
        contractId: 31, status: "in_progress", dueDate: null, completedAt: null, notes: null,
      });
      expect(result).toBeNull();
      expect(await database.storage.getMilestonesByContract(31)).toEqual([]);
    },
  );
});
