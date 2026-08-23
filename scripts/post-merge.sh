#!/bin/bash
set -e

echo "[post-merge] Installing dependencies..."
npm install --legacy-peer-deps

echo "[post-merge] Applying database schema..."
node --input-type=module << 'EOF'
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`
  CREATE TABLE IF NOT EXISTS seed_status (id INTEGER PRIMARY KEY);
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'pelanggan', full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ALTER TABLE users ADD COLUMN IF NOT EXISTS replit_id TEXT UNIQUE;
  CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY, user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT, location TEXT, skills TEXT[] DEFAULT '{}', category TEXT,
    hourly_rate INTEGER, is_verified BOOLEAN DEFAULT false, is_mandor BOOLEAN DEFAULT false,
    certifications TEXT[] DEFAULT '{}', avatar_url TEXT, completed_projects INTEGER DEFAULT 0,
    rating NUMERIC(3,2) DEFAULT 0, rating_count INTEGER DEFAULT 0, years_experience INTEGER,
    phone TEXT, kkni_level TEXT
  );
  CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT, category TEXT,
    budget BIGINT, location TEXT, status TEXT DEFAULT 'open',
    client_id INTEGER REFERENCES users(id), worker_id INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(), deadline TIMESTAMPTZ
  );
  CREATE TABLE IF NOT EXISTS job_applications (
    id SERIAL PRIMARY KEY, job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    applicant_id INTEGER REFERENCES users(id), message TEXT, proposed_budget BIGINT,
    status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY, job_id INTEGER REFERENCES jobs(id),
    client_id INTEGER REFERENCES users(id), worker_id INTEGER REFERENCES users(id),
    title TEXT, description TEXT, total_value BIGINT, status TEXT DEFAULT 'draft',
    client_signed BOOLEAN DEFAULT false, worker_signed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(), start_date TIMESTAMPTZ, end_date TIMESTAMPTZ
  );
  CREATE TABLE IF NOT EXISTS milestones (
    id SERIAL PRIMARY KEY, contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
    title TEXT, description TEXT, amount BIGINT, status TEXT DEFAULT 'pending',
    due_date TIMESTAMPTZ, completed_at TIMESTAMPTZ, notes TEXT
  );
  CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY, reviewer_id INTEGER REFERENCES users(id),
    reviewee_id INTEGER REFERENCES users(id), job_id INTEGER REFERENCES jobs(id),
    rating INTEGER, comment TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS portfolio_items (
    id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title TEXT, description TEXT, category TEXT, image_url TEXT,
    completed_at TIMESTAMPTZ, client_name TEXT
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title TEXT, message TEXT, type TEXT DEFAULT 'info', is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(), link TEXT
  );
  CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY, job_id INTEGER REFERENCES jobs(id),
    sender_id INTEGER REFERENCES users(id), content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS contract_reports (
    id SERIAL PRIMARY KEY, contract_id INTEGER REFERENCES contracts(id),
    reporter_id INTEGER REFERENCES users(id), type TEXT, title TEXT,
    description TEXT, attachments TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS disputes (
    id SERIAL PRIMARY KEY, contract_id INTEGER REFERENCES contracts(id),
    raised_by_id INTEGER REFERENCES users(id), reason TEXT,
    status TEXT DEFAULT 'open', resolution TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(), resolved_at TIMESTAMPTZ
  );
`);
console.log('[post-merge] Schema ready.');
await pool.end();
EOF

echo "[post-merge] Done."
