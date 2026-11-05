import pg from "pg";
import bcrypt from "bcrypt";
import type {
  User,
  Profile,
  Job,
  JobApplication,
  Contract,
  Milestone,
  ContractReport,
  Dispute,
  Review,
  PortfolioItem,
  Notification,
  Message,
} from "../shared/types.js";
import { canonicalMoney } from "../shared/money.js";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,  // give up acquiring a connection after 5 s
  idleTimeoutMillis: 30000,       // release idle connections after 30 s
});

// Prevent unhandled EventEmitter 'error' from crashing the process when an
// idle pooled client drops (e.g. DB restart, network blip).
pool.on("error", (err) => {
  console.error("[pool] idle client error:", err);
});

// ─── Transaction helper ───────────────────────────────────────────────────────
// Acquires a client, runs fn inside BEGIN/COMMIT, and rolls back + re-throws
// on any error so callers never see partial writes.
export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Row mappers: snake_case DB columns → camelCase TS types
function requiredDatabaseNumber(value: unknown, field: string): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Invalid numeric database value for ${field}`);
  }
  return number;
}

function nullableDatabaseNumber(value: unknown, field: string): number | null {
  return value === null || value === undefined
    ? null
    : requiredDatabaseNumber(value, field);
}

export class InvalidMoneyError extends Error {
  readonly code = "INVALID_MONEY_DATA";
  readonly field: string;

  constructor(field: string, detail: string) {
    super(`Invalid monetary value for ${field}: ${detail}`);
    this.name = "InvalidMoneyError";
    this.field = field;
  }
}

function requiredDatabaseMoney(value: unknown, field: string): string {
  try {
    return canonicalMoney(value as string | number | bigint);
  } catch (error) {
    throw new InvalidMoneyError(field, (error as Error).message);
  }
}

function nullableDatabaseMoney(value: unknown, field: string): string | null {
  return value === null || value === undefined ? null : requiredDatabaseMoney(value, field);
}

function userFromRow(r: any): User {
  return {
    id: r.id,
    username: r.username,
    email: r.email,
    password: r.password,
    role: r.role,
    fullName: r.full_name,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    onboardingCompleted: r.onboarding_completed ?? false,
    replitId: r.replit_id ?? null,
  };
}

function profileFromRow(r: any): Profile {
  return {
    id: r.id,
    userId: r.user_id,
    bio: r.bio,
    location: r.location,
    skills: r.skills ?? [],
    category: r.category,
    hourlyRate: nullableDatabaseMoney(r.hourly_rate, "profiles.hourly_rate"),
    isVerified: r.is_verified,
    isMandor: r.is_mandor,
    certifications: r.certifications ?? [],
    avatarUrl: r.avatar_url,
    completedProjects: r.completed_projects,
    rating: parseFloat(r.rating) || 0,
    ratingCount: r.rating_count,
    yearsExperience: r.years_experience,
    phone: r.phone,
    kkniLevel: r.kkni_level,
  };
}

function jobFromRow(r: any): Job {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    budget: requiredDatabaseMoney(r.budget, "jobs.budget"),
    location: r.location,
    status: r.status,
    clientId: r.client_id,
    workerId: r.worker_id,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    deadline: r.deadline instanceof Date ? r.deadline.toISOString() : r.deadline,
  };
}

function applicationFromRow(r: any): JobApplication {
  return {
    id: r.id,
    jobId: r.job_id,
    applicantId: r.applicant_id,
    message: r.message,
    proposedBudget: nullableDatabaseMoney(r.proposed_budget, "job_applications.proposed_budget"),
    status: r.status,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
}

export function contractFromRow(r: any): Contract {
  return {
    id: r.id,
    jobId: r.job_id,
    clientId: r.client_id,
    workerId: r.worker_id,
    title: r.title,
    description: r.description,
    totalValue: requiredDatabaseMoney(r.total_value, "contracts.total_value"),
    status: r.status,
    clientSigned: r.client_signed,
    workerSigned: r.worker_signed,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    startDate: r.start_date instanceof Date ? r.start_date.toISOString() : r.start_date,
    endDate: r.end_date instanceof Date ? r.end_date.toISOString() : r.end_date,
  };
}

function milestoneFromRow(r: any): Milestone {
  return {
    id: r.id,
    contractId: r.contract_id,
    title: r.title,
    description: r.description,
    amount: requiredDatabaseMoney(r.amount, "milestones.amount"),
    status: r.status,
    dueDate: r.due_date instanceof Date ? r.due_date.toISOString() : r.due_date,
    completedAt: r.completed_at instanceof Date ? r.completed_at.toISOString() : r.completed_at,
    notes: r.notes,
  };
}

function reportFromRow(r: any): ContractReport {
  return {
    id: r.id,
    contractId: r.contract_id,
    reporterId: r.reporter_id,
    type: r.type,
    title: r.title,
    description: r.description,
    attachments: r.attachments ?? [],
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
}

function disputeFromRow(r: any): Dispute {
  return {
    id: r.id,
    contractId: r.contract_id,
    raisedById: r.raised_by_id,
    reason: r.reason,
    status: r.status,
    resolution: r.resolution,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    resolvedAt: r.resolved_at instanceof Date ? r.resolved_at.toISOString() : r.resolved_at,
  };
}

function reviewFromRow(r: any): Review {
  return {
    id: r.id,
    reviewerId: r.reviewer_id,
    revieweeId: r.reviewee_id,
    jobId: r.job_id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
}

function portfolioFromRow(r: any): PortfolioItem {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    description: r.description,
    category: r.category,
    imageUrl: r.image_url,
    completedAt: r.completed_at instanceof Date ? r.completed_at.toISOString() : r.completed_at,
    clientName: r.client_name,
  };
}

function notificationFromRow(r: any): Notification {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    message: r.message,
    type: r.type,
    isRead: r.is_read,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    link: r.link,
  };
}

function messageFromRow(r: any): Message {
  return {
    id: r.id,
    jobId: r.job_id,
    senderId: r.sender_id,
    content: r.content,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
}

// ─── Seed ───────────────────────────────────────────────────────────────────

async function seedDatabase() {
  const check = await pool.query("SELECT id FROM seed_status WHERE id = 1");
  if (check.rows.length > 0) return; // already seeded

  // Pre-hash demo passwords before acquiring a client
  const [hashPassword123, hashAdmin123] = await Promise.all([
    bcrypt.hash("password123", 10),
    bcrypt.hash("admin123", 10),
  ]);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Users (passwords stored as bcrypt hashes)
    await client.query(
      `INSERT INTO users (id, username, email, password, role, full_name, created_at, onboarding_completed) VALUES
      ($1, 'budi_pelanggan', 'budi@example.com', $2, 'pelanggan', 'Budi Santoso', '2024-01-15', true),
      ($3, 'ahmad_tukang', 'ahmad@example.com', $4, 'tukang', 'Ahmad Fauzi', '2024-01-10', true),
      ($5, 'siti_tukang', 'siti@example.com', $6, 'tukang', 'Siti Rahayu', '2024-01-12', true),
      ($7, 'admin', 'admin@kerjaproyek.id', $8, 'admin', 'Admin KerjaProyek', '2024-01-01', true),
      ($9, 'rudi_tukang', 'rudi@example.com', $10, 'tukang', 'Rudi Hermawan', '2024-01-08', true),
      ($11, 'dewi_pelanggan', 'dewi@example.com', $12, 'pelanggan', 'Dewi Kusuma', '2024-01-20', true)
      ON CONFLICT DO NOTHING`,
      [
        1, hashPassword123,
        2, hashPassword123,
        3, hashPassword123,
        4, hashAdmin123,
        5, hashPassword123,
        6, hashPassword123,
      ]
    );
    await client.query("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))");

    // Profiles
    await client.query(`
      INSERT INTO profiles (id, user_id, bio, location, skills, category, hourly_rate, is_verified, is_mandor, certifications, avatar_url, completed_projects, rating, rating_count, years_experience, phone, kkni_level) VALUES
      (1, 1, 'Pemilik rumah yang sedang merencanakan renovasi besar.', 'Jakarta Selatan', '{}', NULL, NULL, true, false, '{}', NULL, 3, 4.8, 3, NULL, '0812-3456-7890', NULL),
      (2, 2, 'Tukang bangunan berpengalaman 10 tahun, spesialis renovasi rumah dan konstruksi gedung.', 'Bandung', ARRAY['Tukang Batu','Tukang Besi Beton','Mandor Konstruksi'], 'Konstruksi Baru', 150000, true, true, ARRAY['BNSP Level 4','K3 Konstruksi'], NULL, 50, 4.9, 45, 10, '0813-9876-5432', 'Level 4 - Supervisor'),
      (3, 3, 'Ahli pengecatan dan interior dengan sertifikasi BNSP.', 'Surabaya', ARRAY['Tukang Cat Bangunan Gedung','Renovasi Rumah','Pengecatan'], 'Pengecatan', 120000, true, false, ARRAY['BNSP Level 3'], NULL, 30, 4.7, 28, 7, '0819-1234-5678', 'Level 3 - Teknisi/Analis Madya'),
      (4, 4, 'Admin platform KerjaProyek.', 'Jakarta', '{}', NULL, NULL, true, false, '{}', NULL, 0, 0, 0, NULL, NULL, NULL),
      (5, 5, 'Spesialis las konstruksi dan struktur baja dengan pengalaman proyek gedung bertingkat.', 'Medan', ARRAY['Tukang Las Listrik','Tukang Las Konstruksi','Beton'], 'Las', 180000, true, true, ARRAY['BNSP Level 5','Welder Certified','K3 Konstruksi'], NULL, 65, 4.8, 60, 15, '0811-2233-4455', 'Level 5 - Kepala Pelaksana'),
      (6, 6, 'Pengembang properti yang aktif membangun hunian modern.', 'Yogyakarta', '{}', NULL, NULL, false, false, '{}', NULL, 5, 4.5, 4, NULL, '0856-7788-9900', NULL)
      ON CONFLICT DO NOTHING
    `);
    await client.query("SELECT setval('profiles_id_seq', (SELECT MAX(id) FROM profiles))");

    // Jobs
    await client.query(`
      INSERT INTO jobs (id, title, description, category, budget, location, status, client_id, worker_id, created_at, deadline) VALUES
      (1, 'Renovasi Kamar Mandi 2 Unit', 'Renovasi total 2 kamar mandi, termasuk penggantian keramik, instalasi shower baru, dan pengecatan ulang.', 'Renovasi', 25000000, 'Jakarta Selatan', 'open', 1, NULL, '2024-12-01', '2025-01-15'),
      (2, 'Pembangunan Pagar Beton', 'Pembangunan pagar beton keliling halaman rumah sepanjang 80 meter.', 'Konstruksi Baru', 40000000, 'Bandung', 'in_progress', 6, 2, '2024-11-15', '2025-01-30'),
      (3, 'Pengecatan Eksterior Rumah 2 Lantai', 'Pengecatan ulang eksterior rumah 2 lantai luas 200m2, termasuk persiapan permukaan dan cat premium.', 'Pengecatan', 15000000, 'Surabaya', 'completed', 1, 3, '2024-10-01', '2024-11-01'),
      (4, 'Instalasi Instalasi Listrik Rumah Baru', 'Pemasangan instalasi listrik lengkap untuk rumah baru 3 kamar tidur, termasuk panel dan grounding.', 'Listrik', 20000000, 'Yogyakarta', 'open', 6, NULL, '2024-12-10', '2025-02-28'),
      (5, 'Konstruksi Gudang 500m2', 'Pembangunan gudang baru seluas 500m2 dengan struktur baja, termasuk pondasi dan atap metal.', 'Konstruksi Baru', 250000000, 'Medan', 'open', 1, NULL, '2024-12-05', '2025-06-30')
      ON CONFLICT DO NOTHING
    `);
    await client.query("SELECT setval('jobs_id_seq', (SELECT MAX(id) FROM jobs))");

    // Applications
    await client.query(`
      INSERT INTO job_applications (id, job_id, applicant_id, message, proposed_budget, status, created_at) VALUES
      (1, 1, 2, 'Saya berpengalaman 10 tahun dalam renovasi kamar mandi. Siap mulai minggu depan.', 23000000, 'pending', '2024-12-02'),
      (2, 1, 5, 'Bisa handle proyek ini dengan tim berpengalaman saya.', 24000000, 'pending', '2024-12-03')
      ON CONFLICT DO NOTHING
    `);
    await client.query("SELECT setval('job_applications_id_seq', (SELECT MAX(id) FROM job_applications))");

    // Contracts
    await client.query(`
      INSERT INTO contracts (id, job_id, client_id, worker_id, title, description, total_value, status, client_signed, worker_signed, created_at, start_date, end_date) VALUES
      (1, 2, 6, 2, 'Kontrak Pembangunan Pagar Beton', 'Pekerjaan pembangunan pagar beton keliling halaman 80 meter.', 38000000, 'active', true, true, '2024-11-20', '2024-11-25', '2025-01-30')
      ON CONFLICT DO NOTHING
    `);
    await client.query("SELECT setval('contracts_id_seq', (SELECT MAX(id) FROM contracts))");

    // Milestones
    await client.query(`
      INSERT INTO milestones (id, contract_id, title, description, amount, status, due_date, completed_at, notes) VALUES
      (1, 1, 'Persiapan & Pondasi', 'Persiapan lahan dan pengecoran pondasi pagar', 15000000, 'approved', '2024-12-10', '2024-12-08', 'Pondasi selesai tepat waktu'),
      (2, 1, 'Pemasangan Bata & Plester', 'Pemasangan bata dan plesteran dinding pagar', 15000000, 'in_progress', '2025-01-10', NULL, NULL),
      (3, 1, 'Finishing & Cat', 'Finishing akhir dan pengecatan pagar', 8000000, 'pending', '2025-01-25', NULL, NULL)
      ON CONFLICT DO NOTHING
    `);
    await client.query("SELECT setval('milestones_id_seq', (SELECT MAX(id) FROM milestones))");

    // Reviews
    await client.query(`
      INSERT INTO reviews (id, reviewer_id, reviewee_id, job_id, rating, comment, created_at) VALUES
      (1, 1, 3, 3, 5, 'Pengecatan sangat rapi dan selesai tepat waktu. Sangat puas!', '2024-11-05'),
      (2, 6, 2, 2, 5, 'Mandor yang sangat profesional, hasil kerja memuaskan.', '2024-12-01')
      ON CONFLICT DO NOTHING
    `);
    await client.query("SELECT setval('reviews_id_seq', (SELECT MAX(id) FROM reviews))");

    // Portfolio items
    await client.query(`
      INSERT INTO portfolio_items (id, user_id, title, description, category, image_url, completed_at, client_name) VALUES
      (1, 2, 'Renovasi Rumah Minimalis Modern', 'Renovasi total rumah 150m2 dengan konsep minimalis modern di Jakarta.', 'Renovasi', NULL, '2024-09-01', 'Pak Hendra'),
      (2, 2, 'Pembangunan Ruko 3 Lantai', 'Konstruksi ruko 3 lantai untuk usaha di area komersial Bandung.', 'Konstruksi Baru', NULL, '2024-06-15', 'Bu Indah'),
      (3, 3, 'Pengecatan Apartemen 50 Unit', 'Proyek pengecatan interior dan eksterior apartemen 50 unit di Surabaya.', 'Pengecatan', NULL, '2024-10-20', 'PT Griya Indah'),
      (4, 5, 'Konstruksi Jembatan Baja', 'Pemasangan rangka baja jembatan pejalan kaki di kawasan industri.', 'Las', NULL, '2024-08-30', 'Pemda Kota Medan')
      ON CONFLICT DO NOTHING
    `);
    await client.query("SELECT setval('portfolio_items_id_seq', (SELECT MAX(id) FROM portfolio_items))");

    // Notifications
    await client.query(`
      INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at, link) VALUES
      (1, 1, 'Lamaran Baru', 'Ahmad Fauzi melamar untuk proyek Renovasi Kamar Mandi Anda.', 'info', false, '2024-12-02', '/jobs/1'),
      (2, 2, 'Profil Terverifikasi', 'Selamat! Profil Anda telah diverifikasi oleh tim KerjaProyek.', 'success', true, '2024-11-20', '/profile/edit')
      ON CONFLICT DO NOTHING
    `);
    await client.query("SELECT setval('notifications_id_seq', (SELECT MAX(id) FROM notifications))");

    await client.query("INSERT INTO seed_status (id) VALUES (1) ON CONFLICT DO NOTHING");
    await client.query("COMMIT");
    console.log("[storage] Database seeded with demo data.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[storage] Seed failed:", err);
    throw err;
  } finally {
    client.release();
  }
}

// ─── Storage API ─────────────────────────────────────────────────────────────

const storageApi = {
  // Users
  getUsers: async (): Promise<User[]> => {
    const r = await pool.query("SELECT * FROM users ORDER BY id");
    return r.rows.map(userFromRow);
  },
  getUserById: async (id: number): Promise<User | undefined> => {
    const r = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    return r.rows[0] ? userFromRow(r.rows[0]) : undefined;
  },
  getUserByEmail: async (email: string): Promise<User | undefined> => {
    const r = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    return r.rows[0] ? userFromRow(r.rows[0]) : undefined;
  },
  getUserByUsername: async (username: string): Promise<User | undefined> => {
    const r = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    return r.rows[0] ? userFromRow(r.rows[0]) : undefined;
  },
  getUserByReplitId: async (replitId: string): Promise<User | undefined> => {
    const r = await pool.query("SELECT * FROM users WHERE replit_id = $1", [replitId]);
    return r.rows[0] ? userFromRow(r.rows[0]) : undefined;
  },
  createUser: async (data: Omit<User, "id" | "createdAt" | "onboardingCompleted"> & { replitId?: string; onboardingCompleted?: boolean }): Promise<User> => {
    const r = await pool.query(
      "INSERT INTO users (username, email, password, role, full_name, replit_id, onboarding_completed) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [data.username, data.email, data.password, data.role, data.fullName, (data as any).replitId ?? null, data.onboardingCompleted ?? false]
    );
    return userFromRow(r.rows[0]);
  },
  updateUserReplitId: async (userId: number, replitId: string | null): Promise<void> => {
    await pool.query("UPDATE users SET replit_id = $1 WHERE id = $2", [replitId, userId]);
  },
  updateUserRole: async (userId: number, role: string): Promise<number> => {
    return withTransaction(async (client) => {
      let withdrawnApplications = 0;

      // A worker can no longer act on pending applications after switching to
      // pelanggan. Keep the history, but mark those applications as withdrawn
      // together with the role change so the two states cannot diverge.
      if (role === "pelanggan") {
        const result = await client.query(
          "UPDATE job_applications SET status = 'withdrawn' WHERE applicant_id = $1 AND status = 'pending'",
          [userId]
        );
        withdrawnApplications = result.rowCount ?? 0;
      }

      await client.query("UPDATE users SET role = $1 WHERE id = $2", [role, userId]);
      return withdrawnApplications;
    });
  },
  completeOnboarding: async (userId: number): Promise<void> => {
    await pool.query("UPDATE users SET onboarding_completed = true WHERE id = $1", [userId]);
  },

  // Atomically create a user + their profile in a single transaction so a DB
  // failure between the two writes never leaves an orphan user with no profile.
  createUserWithProfile: async (
    userData: Omit<User, "id" | "createdAt" | "onboardingCompleted"> & { replitId?: string; onboardingCompleted?: boolean },
    profileData: Omit<Profile, "id" | "userId">
  ): Promise<{ user: User; profile: Profile }> => {
    return withTransaction(async (client) => {
      const ur = await client.query(
        "INSERT INTO users (username, email, password, role, full_name, replit_id, onboarding_completed) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
        [userData.username, userData.email, userData.password, userData.role, userData.fullName, (userData as any).replitId ?? null, userData.onboardingCompleted ?? false]
      );
      const user = userFromRow(ur.rows[0]);

      const pr = await client.query(
        `INSERT INTO profiles (user_id, bio, location, skills, category, hourly_rate, is_verified, is_mandor,
          certifications, avatar_url, completed_projects, rating, rating_count, years_experience, phone, kkni_level)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
        [
          user.id, profileData.bio, profileData.location, profileData.skills,
          profileData.category,
          profileData.hourlyRate === null
            ? null
            : requiredDatabaseMoney(profileData.hourlyRate, "profiles.hourly_rate"),
          profileData.isVerified,
          profileData.isMandor, profileData.certifications, profileData.avatarUrl,
          profileData.completedProjects, profileData.rating, profileData.ratingCount,
          profileData.yearsExperience, profileData.phone, profileData.kkniLevel,
        ]
      );
      const profile = profileFromRow(pr.rows[0]);

      return { user, profile };
    });
  },

  // Profiles
  getProfiles: async (): Promise<Profile[]> => {
    const r = await pool.query("SELECT * FROM profiles ORDER BY id");
    return r.rows.map(profileFromRow);
  },
  getProfileByUserId: async (userId: number): Promise<Profile | undefined> => {
    const r = await pool.query("SELECT * FROM profiles WHERE user_id = $1", [userId]);
    return r.rows[0] ? profileFromRow(r.rows[0]) : undefined;
  },
  createProfile: async (data: Omit<Profile, "id">): Promise<Profile> => {
    const r = await pool.query(
      `INSERT INTO profiles (user_id, bio, location, skills, category, hourly_rate, is_verified, is_mandor,
        certifications, avatar_url, completed_projects, rating, rating_count, years_experience, phone, kkni_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [
        data.userId, data.bio, data.location, data.skills, data.category,
        data.hourlyRate === null
          ? null
          : requiredDatabaseMoney(data.hourlyRate, "profiles.hourly_rate"),
        data.isVerified, data.isMandor, data.certifications,
        data.avatarUrl, data.completedProjects, data.rating, data.ratingCount,
        data.yearsExperience, data.phone, data.kkniLevel,
      ]
    );
    return profileFromRow(r.rows[0]);
  },
  updateProfile: async (userId: number, data: Partial<Profile>): Promise<Profile | null> => {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    const map: Record<string, string> = {
      bio: "bio", location: "location", skills: "skills", category: "category",
      hourlyRate: "hourly_rate", isVerified: "is_verified", isMandor: "is_mandor",
      certifications: "certifications", avatarUrl: "avatar_url",
      completedProjects: "completed_projects", rating: "rating", ratingCount: "rating_count",
      yearsExperience: "years_experience", phone: "phone", kkniLevel: "kkni_level",
    };
    for (const [key, col] of Object.entries(map)) {
      if (key in data) {
        fields.push(`${col} = $${i++}`);
        const value = (data as any)[key];
        values.push(
          key === "hourlyRate" && value !== null
            ? requiredDatabaseMoney(value, "profiles.hourly_rate")
            : value,
        );
      }
    }
    if (!fields.length) {
      const r = await pool.query("SELECT * FROM profiles WHERE user_id = $1", [userId]);
      return r.rows[0] ? profileFromRow(r.rows[0]) : null;
    }
    values.push(userId);
    const r = await pool.query(
      `UPDATE profiles SET ${fields.join(", ")} WHERE user_id = $${i} RETURNING *`,
      values
    );
    return r.rows[0] ? profileFromRow(r.rows[0]) : null;
  },

  // Jobs
  getJobs: async (filters?: { category?: string; status?: string; clientId?: number }): Promise<Job[]> => {
    let q = "SELECT * FROM jobs WHERE 1=1";
    const params: any[] = [];
    let i = 1;
    if (filters?.category) { q += ` AND category = $${i++}`; params.push(filters.category); }
    if (filters?.status) { q += ` AND status = $${i++}`; params.push(filters.status); }
    if (filters?.clientId) { q += ` AND client_id = $${i++}`; params.push(filters.clientId); }
    q += " ORDER BY created_at DESC";
    const r = await pool.query(q, params);
    return r.rows.map(jobFromRow);
  },
  getJobById: async (id: number): Promise<Job | undefined> => {
    const r = await pool.query("SELECT * FROM jobs WHERE id = $1", [id]);
    return r.rows[0] ? jobFromRow(r.rows[0]) : undefined;
  },
  createJob: async (data: Omit<Job, "id" | "createdAt">): Promise<Job> => {
    const r = await pool.query(
      `INSERT INTO jobs (title, description, category, budget, location, status, client_id, worker_id, deadline)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
       [data.title, data.description, data.category, canonicalMoney(data.budget), data.location,
       data.status, data.clientId, data.workerId, data.deadline]
    );
    return jobFromRow(r.rows[0]);
  },
  updateJob: async (id: number, data: Partial<Job>): Promise<Job | null> => {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    const map: Record<string, string> = {
      title: "title", description: "description", category: "category",
      budget: "budget", location: "location", status: "status",
      clientId: "client_id", workerId: "worker_id", deadline: "deadline",
    };
    for (const [key, col] of Object.entries(map)) {
      if (key in data) {
        fields.push(`${col} = $${i++}`);
        values.push(key === "budget" ? canonicalMoney((data as any)[key]) : (data as any)[key]);
      }
    }
    if (!fields.length) return storage.getJobById(id).then(j => j ?? null);
    values.push(id);
    const r = await pool.query(
      `UPDATE jobs SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    return r.rows[0] ? jobFromRow(r.rows[0]) : null;
  },

  // Applications
  getApplicationsByJob: async (jobId: number): Promise<JobApplication[]> => {
    const r = await pool.query("SELECT * FROM job_applications WHERE job_id = $1", [jobId]);
    return r.rows.map(applicationFromRow);
  },
  getApplicationsByUser: async (userId: number): Promise<JobApplication[]> => {
    const r = await pool.query("SELECT * FROM job_applications WHERE applicant_id = $1", [userId]);
    return r.rows.map(applicationFromRow);
  },
  getApplicationsByApplicant: async (userId: number): Promise<JobApplication[]> => {
    const r = await pool.query("SELECT * FROM job_applications WHERE applicant_id = $1", [userId]);
    return r.rows.map(applicationFromRow);
  },
  getAllApplications: async (): Promise<JobApplication[]> => {
    const r = await pool.query("SELECT * FROM job_applications ORDER BY id");
    return r.rows.map(applicationFromRow);
  },
  getApplicationById: async (id: number): Promise<JobApplication | undefined> => {
    const r = await pool.query("SELECT * FROM job_applications WHERE id = $1", [id]);
    return r.rows[0] ? applicationFromRow(r.rows[0]) : undefined;
  },
  createApplication: async (data: Omit<JobApplication, "id" | "createdAt">): Promise<JobApplication> => {
    const r = await pool.query(
      `INSERT INTO job_applications (job_id, applicant_id, message, proposed_budget, status)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
       [data.jobId, data.applicantId, data.message, data.proposedBudget === null ? null : canonicalMoney(data.proposedBudget), data.status]
    );
    return applicationFromRow(r.rows[0]);
  },
  updateApplication: async (
    id: number,
    data: Partial<JobApplication>,
    expectedStatus?: JobApplication["status"]
  ): Promise<JobApplication | null> => {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    const map: Record<string, string> = {
      status: "status", message: "message", proposedBudget: "proposed_budget",
    };
    for (const [key, col] of Object.entries(map)) {
      if (key in data) {
        fields.push(`${col} = $${i++}`);
        const value = (data as any)[key];
        values.push(key === "proposedBudget" && value !== null ? canonicalMoney(value) : value);
      }
    }
    if (!fields.length) return storage.getApplicationById(id).then(a => a ?? null);
    values.push(id);
    let where = `id = $${i++}`;
    if (expectedStatus !== undefined) {
      values.push(expectedStatus);
      where += ` AND status = $${i++}`;
    }
    const r = await pool.query(
      `UPDATE job_applications SET ${fields.join(", ")} WHERE ${where} RETURNING *`,
      values
    );
    return r.rows[0] ? applicationFromRow(r.rows[0]) : null;
  },

  // Contracts
  getAllContracts: async (): Promise<Contract[]> => {
    const r = await pool.query("SELECT * FROM contracts ORDER BY id");
    return r.rows.map(contractFromRow);
  },
  getContracts: async (userId: number): Promise<Contract[]> => {
    const r = await pool.query(
      "SELECT * FROM contracts WHERE client_id = $1 OR worker_id = $1 ORDER BY id",
      [userId]
    );
    return r.rows.map(contractFromRow);
  },
  getContractById: async (id: number): Promise<Contract | undefined> => {
    const r = await pool.query("SELECT * FROM contracts WHERE id = $1", [id]);
    return r.rows[0] ? contractFromRow(r.rows[0]) : undefined;
  },
  createContract: async (data: Omit<Contract, "id" | "createdAt">): Promise<Contract> => {
    const r = await pool.query(
      `INSERT INTO contracts (job_id, client_id, worker_id, title, description, total_value, status,
        client_signed, worker_signed, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [data.jobId, data.clientId, data.workerId, data.title, data.description,
       canonicalMoney(data.totalValue), data.status, data.clientSigned, data.workerSigned,
       data.startDate, data.endDate]
    );
    return contractFromRow(r.rows[0]);
  },
  updateContract: async (id: number, data: Partial<Contract>): Promise<Contract | null> => {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    const map: Record<string, string> = {
      title: "title", description: "description", totalValue: "total_value",
      status: "status", clientSigned: "client_signed", workerSigned: "worker_signed",
      startDate: "start_date", endDate: "end_date",
    };
    for (const [key, col] of Object.entries(map)) {
      if (key in data) {
        fields.push(`${col} = $${i++}`);
        values.push(key === "totalValue" ? canonicalMoney((data as any)[key]) : (data as any)[key]);
      }
    }
    if (!fields.length) return storage.getContractById(id).then(c => c ?? null);
    values.push(id);
    const r = await pool.query(
      `UPDATE contracts SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    return r.rows[0] ? contractFromRow(r.rows[0]) : null;
  },

  // Milestones
  getMilestonesByContract: async (contractId: number): Promise<Milestone[]> => {
    const r = await pool.query("SELECT * FROM milestones WHERE contract_id = $1 ORDER BY id", [contractId]);
    return r.rows.map(milestoneFromRow);
  },
  getMilestoneById: async (id: number): Promise<Milestone | undefined> => {
    const r = await pool.query("SELECT * FROM milestones WHERE id = $1", [id]);
    return r.rows[0] ? milestoneFromRow(r.rows[0]) : undefined;
  },
  createMilestone: async (data: Omit<Milestone, "id">): Promise<Milestone | null> => withTransaction(async (client) => {
    // Serialize against completion on the parent, even when there are no
    // milestones yet. Re-read status after acquiring the lock.
    const contract = await client.query(
      "SELECT status FROM contracts WHERE id = $1 FOR UPDATE",
      [data.contractId],
    );
    if (contract.rows[0]?.status !== "active") return null;
    const r = await client.query(
      `INSERT INTO milestones (contract_id, title, description, amount, status, due_date, completed_at, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
       [data.contractId, data.title, data.description, canonicalMoney(data.amount), data.status,
       data.dueDate, data.completedAt, data.notes]
    );
    return milestoneFromRow(r.rows[0]);
  }),
  updateMilestone: async (
    id: number,
    data: Partial<Milestone>,
    expectedStatuses?: Milestone["status"][],
  ): Promise<Milestone | null> => {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    const map: Record<string, string> = {
      title: "title", description: "description", amount: "amount",
      status: "status", dueDate: "due_date", completedAt: "completed_at", notes: "notes",
    };
    for (const [key, col] of Object.entries(map)) {
      if (key in data) {
        fields.push(`${col} = $${i++}`);
        values.push(key === "amount" ? canonicalMoney((data as any)[key]) : (data as any)[key]);
      }
    }
    if (!fields.length) return storage.getMilestoneById(id).then(m => m ?? null);
    values.push(id);
    let where = `id = $${i++}`;
    if (expectedStatuses?.length) {
      values.push(expectedStatuses);
      where += ` AND status = ANY($${i++}::text[])`;
    }
    const r = await pool.query(
      `UPDATE milestones SET ${fields.join(", ")} WHERE ${where} RETURNING *`,
      values
    );
    return r.rows[0] ? milestoneFromRow(r.rows[0]) : null;
  },

  // Contract Reports
  getReportsByContract: async (contractId: number): Promise<ContractReport[]> => {
    const r = await pool.query("SELECT * FROM contract_reports WHERE contract_id = $1 ORDER BY id", [contractId]);
    return r.rows.map(reportFromRow);
  },
  createReport: async (data: Omit<ContractReport, "id" | "createdAt">): Promise<ContractReport> => {
    const r = await pool.query(
      `INSERT INTO contract_reports (contract_id, reporter_id, type, title, description, attachments)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [data.contractId, data.reporterId, data.type, data.title, data.description, data.attachments]
    );
    return reportFromRow(r.rows[0]);
  },

  // Disputes
  getDisputes: async (userId?: number): Promise<Dispute[]> => {
    if (userId !== undefined) {
      const r = await pool.query(
        `SELECT d.*
         FROM disputes d
         JOIN contracts c ON c.id = d.contract_id
         WHERE c.client_id = $1 OR c.worker_id = $1
         ORDER BY d.id`,
        [userId],
      );
      return r.rows.map(disputeFromRow);
    }
    const r = await pool.query("SELECT * FROM disputes ORDER BY id");
    return r.rows.map(disputeFromRow);
  },
  getDisputeById: async (id: number): Promise<Dispute | undefined> => {
    const r = await pool.query("SELECT * FROM disputes WHERE id = $1", [id]);
    return r.rows[0] ? disputeFromRow(r.rows[0]) : undefined;
  },
  createDispute: async (data: Omit<Dispute, "id" | "createdAt">): Promise<Dispute> => {
    const r = await pool.query(
      `INSERT INTO disputes (contract_id, raised_by_id, reason, status, resolution, resolved_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [data.contractId, data.raisedById, data.reason, data.status, data.resolution, data.resolvedAt]
    );
    return disputeFromRow(r.rows[0]);
  },
  updateDispute: async (id: number, data: Partial<Dispute>): Promise<Dispute | null> => {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    const map: Record<string, string> = {
      status: "status", resolution: "resolution", resolvedAt: "resolved_at",
    };
    for (const [key, col] of Object.entries(map)) {
      if (key in data) { fields.push(`${col} = $${i++}`); values.push((data as any)[key]); }
    }
    if (!fields.length) return storage.getDisputeById(id).then(d => d ?? null);
    values.push(id);
    const r = await pool.query(
      `UPDATE disputes SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    return r.rows[0] ? disputeFromRow(r.rows[0]) : null;
  },

  // Reviews
  getReviewsByUser: async (userId: number): Promise<Review[]> => {
    const r = await pool.query("SELECT * FROM reviews WHERE reviewee_id = $1 ORDER BY id", [userId]);
    return r.rows.map(reviewFromRow);
  },
  createReview: async (data: Omit<Review, "id" | "createdAt">): Promise<Review> => {
    const r = await pool.query(
      `INSERT INTO reviews (reviewer_id, reviewee_id, job_id, rating, comment)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [data.reviewerId, data.revieweeId, data.jobId, data.rating, data.comment]
    );
    return reviewFromRow(r.rows[0]);
  },
  getRating: async (userId: number): Promise<{ average: number; count: number }> => {
    const r = await pool.query(
      "SELECT AVG(rating)::numeric(3,1) as avg, COUNT(*)::int as cnt FROM reviews WHERE reviewee_id = $1",
      [userId]
    );
    const avg = parseFloat(r.rows[0].avg) || 0;
    return { average: avg, count: r.rows[0].cnt };
  },

  // Portfolio
  getPortfolioByUser: async (userId: number): Promise<PortfolioItem[]> => {
    const r = await pool.query("SELECT * FROM portfolio_items WHERE user_id = $1 ORDER BY id", [userId]);
    return r.rows.map(portfolioFromRow);
  },
  createPortfolioItem: async (data: Omit<PortfolioItem, "id">): Promise<PortfolioItem> => {
    const r = await pool.query(
      `INSERT INTO portfolio_items (user_id, title, description, category, image_url, completed_at, client_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [data.userId, data.title, data.description, data.category, data.imageUrl,
       data.completedAt, data.clientName]
    );
    return portfolioFromRow(r.rows[0]);
  },
  deletePortfolioItem: async (id: number, userId: number): Promise<boolean> => {
    const r = await pool.query(
      "DELETE FROM portfolio_items WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    return (r.rowCount ?? 0) > 0;
  },

  // Notifications
  getNotifications: async (userId: number): Promise<Notification[]> => {
    const r = await pool.query(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    return r.rows.map(notificationFromRow);
  },
  getUnreadCount: async (userId: number): Promise<number> => {
    const r = await pool.query(
      "SELECT COUNT(*)::int as cnt FROM notifications WHERE user_id = $1 AND is_read = false",
      [userId]
    );
    return r.rows[0].cnt;
  },
  createNotification: async (data: Omit<Notification, "id" | "createdAt">): Promise<Notification> => {
    const r = await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, is_read, link)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [data.userId, data.title, data.message, data.type, data.isRead, data.link]
    );
    return notificationFromRow(r.rows[0]);
  },
  markNotificationRead: async (id: number, userId: number): Promise<boolean> => {
    const r = await pool.query(
      "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    return (r.rowCount ?? 0) > 0;
  },
  markAllRead: async (userId: number): Promise<void> => {
    await pool.query("UPDATE notifications SET is_read = true WHERE user_id = $1", [userId]);
  },

  // Messages
  getMessagesByJob: async (jobId: number): Promise<Message[]> => {
    const r = await pool.query("SELECT * FROM messages WHERE job_id = $1 ORDER BY created_at", [jobId]);
    return r.rows.map(messageFromRow);
  },
  createMessage: async (data: Omit<Message, "id" | "createdAt">): Promise<Message> => {
    const r = await pool.query(
      "INSERT INTO messages (job_id, sender_id, content) VALUES ($1,$2,$3) RETURNING *",
      [data.jobId, data.senderId, data.content]
    );
    return messageFromRow(r.rows[0]);
  },

  // Analytics
  getAnalytics: async () => {
    const [users, jobs, profiles, contracts] = await Promise.all([
      pool.query("SELECT role FROM users"),
      pool.query("SELECT status FROM jobs"),
      pool.query("SELECT is_verified FROM profiles"),
      pool.query("SELECT status, total_value FROM contracts"),
    ]);
    return {
      totalUsers: users.rows.length,
      totalJobs: jobs.rows.length,
      activeJobs: jobs.rows.filter((j: any) => j.status === "open" || j.status === "in_progress").length,
      completedJobs: jobs.rows.filter((j: any) => j.status === "completed").length,
      totalWorkers: users.rows.filter((u: any) => u.role === "tukang").length,
      totalClients: users.rows.filter((u: any) => u.role === "pelanggan").length,
      verifiedWorkers: profiles.rows.filter((p: any) => p.is_verified).length,
      totalContracts: contracts.rows.length,
      activeContracts: contracts.rows.filter((c: any) => c.status === "active").length,
      totalRevenue: contracts.rows
        .reduce((sum: bigint, c: any) => sum + BigInt(requiredDatabaseMoney(c.total_value, "contracts.total_value")), 0n)
        .toString(),
    };
  },
};

// Storage methods are the boundary between route/application code and the
// database. Add stable metadata here so the global Express error handler can
// distinguish a storage failure from an application bug without exposing the
// database error details in an HTTP response.
export class StorageError extends Error {
  readonly source = "storage";
  readonly cause: unknown;

  constructor(operation: string, cause: unknown) {
    super(`Storage operation failed: ${operation}`);
    this.name = "StorageError";
    this.cause = cause;
  }
}

export const storage = new Proxy(storageApi, {
  get(target, property, receiver) {
    const value = Reflect.get(target, property, receiver);
    if (typeof value !== "function") return value;

    return (...args: any[]) =>
      Promise.resolve()
        .then(() => value.apply(target, args))
        .catch((error) => {
          if (error instanceof StorageError) throw error;
          throw new StorageError(String(property), error);
        });
  },
}) as typeof storageApi;

// Run seed on startup
// ─── Password migration ───────────────────────────────────────────────────────
// Migrates any existing plain-text passwords to bcrypt hashes on startup.
// Safe to run every time: bcrypt hashes always start with "$2", so already-
// hashed passwords are skipped.
// Bcrypt hashes always match $2[aby]$dd$<53 chars of base64> — 60 chars total.
const BCRYPT_HASH_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

async function migratePasswordsToHash() {
  const { rows } = await pool.query(
    "SELECT id, password FROM users WHERE password IS NOT NULL AND password != ''"
  );
  // Filter in JS using the full bcrypt hash regex so a plain-text password
  // that happens to start with "$2" is not mistakenly skipped.
  const needsMigration = rows.filter((r) => !BCRYPT_HASH_RE.test(r.password));
  if (needsMigration.length === 0) return;
  console.log(`[storage] Migrating ${needsMigration.length} plain-text password(s) to bcrypt hashes.`);
  for (const row of needsMigration) {
    const hashed = await bcrypt.hash(row.password, 10);
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashed, row.id]);
  }
  console.log("[storage] Password migration complete.");
}

// Exported so callers (e.g. server/index.ts) can await completion before
// accepting requests, ensuring no user is served during an active migration.
export const startupReady: Promise<void> = seedDatabase()
  .then(() => migratePasswordsToHash())
  .catch((err) => {
    console.error("[storage] Startup seed/migration error:", err);
    // Don't re-throw — a seed/migration failure should not crash the process.
  });
