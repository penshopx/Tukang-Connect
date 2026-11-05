import type pg from "pg";
import type { Contract, Notification } from "../shared/types.js";
import { pool, storage, withTransaction } from "./storage.js";

type NotificationDraft = Omit<Notification, "id" | "createdAt">;

// This write must use the completion transaction, never a separate connection.
// Snapshot names here so delivery needs no fallible post-commit user/job reads.
export async function enqueueContractNotifications(client: pg.PoolClient, contract: Contract) {
  const { rows } = await client.query(
    `SELECT j.title, c.full_name AS client_name, w.full_name AS worker_name
     FROM contracts ct
     LEFT JOIN jobs j ON j.id = ct.job_id
     LEFT JOIN users c ON c.id = ct.client_id
     LEFT JOIN users w ON w.id = ct.worker_id
     WHERE ct.id = $1`,
    [contract.id],
  );
  const names = rows[0];
  const jobTitle = names?.title || "Proyek";
  const payload: NotificationDraft[] = [
    {
      userId: contract.workerId,
      title: "Proyek Selesai! 🎉",
      message: `${names?.client_name || "Klien"} telah menyelesaikan kontrak "${jobTitle}". Profil Anda diperbarui.`,
      type: "success",
      isRead: false,
      link: `/contracts/${contract.id}`,
    },
    {
      userId: contract.clientId,
      title: "Berikan Ulasan",
      message: `Proyek "${jobTitle}" selesai! Berikan ulasan untuk ${names?.worker_name || "tukang"} untuk membantu komunitas.`,
      type: "info",
      isRead: false,
      link: `/experts/${contract.workerId}`,
    },
  ];
  await client.query(
    "INSERT INTO contract_notification_outbox (contract_id, payload) VALUES ($1, $2::jsonb)",
    [contract.id, JSON.stringify(payload)],
  );
  return names?.worker_name as string | undefined;
}

// Each event is independent: a failing event must not roll back other deliveries.
// Both notifications and removal of the event commit together. Row locks prevent
// concurrent request/startup/interval workers from delivering the same event twice.
export async function deliverContractNotifications(contractId?: number): Promise<void> {
  const pending = await pool.query(
    `SELECT contract_id FROM contract_notification_outbox
     WHERE next_attempt_at <= now() AND ($1::integer IS NULL OR contract_id = $1)
     ORDER BY next_attempt_at, contract_id LIMIT 50`,
    [contractId ?? null],
  );
  for (const event of pending.rows) {
    try {
      await withTransaction(async (client) => {
        const locked = await client.query(
          `SELECT payload FROM contract_notification_outbox
           WHERE contract_id = $1 AND next_attempt_at <= now()
           FOR UPDATE SKIP LOCKED`,
          [event.contract_id],
        );
        if (!locked.rows.length) return;
        for (const notification of locked.rows[0].payload as NotificationDraft[]) {
          await storage.createNotification(notification, client);
        }
        await client.query("DELETE FROM contract_notification_outbox WHERE contract_id = $1", [event.contract_id]);
      });
    } catch (error) {
      // Persist retry timing too; a permanently bad event cannot starve the queue.
      await pool.query(
        `UPDATE contract_notification_outbox
         SET attempts = attempts + 1,
             next_attempt_at = now() + LEAST(300, 5 * power(2, LEAST(attempts, 6))) * interval '1 second'
         WHERE contract_id = $1`,
        [event.contract_id],
      );
      console.error("[contract-notifications] Delivery deferred:", error);
    }
  }
}

export function startContractNotificationDelivery() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await deliverContractNotifications();
    } catch (error) {
      console.error("[contract-notifications] Retry scan failed:", error);
    } finally {
      running = false;
    }
  };
  void tick(); // Recover pending events immediately after a server restart.
  const timer = setInterval(() => void tick(), 30_000);
  timer.unref();
  return () => clearInterval(timer);
}
