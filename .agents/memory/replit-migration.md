---
name: Replit migration notes
description: Vite HMR proxy config and pg/schema setup required after GitHub import to Replit
---

## Vite HMR behind Replit proxy
- `vite.config.ts` must set `server.allowedHosts: true` and HMR to `{ protocol: "wss", host: process.env.REPLIT_DEV_DOMAIN, clientPort: 443 }` when `REPLIT_DEV_DOMAIN` is set.
- Vite proxy target must be `http://127.0.0.1:3000` (not `localhost`) to avoid ECONNREFUSED.
- Express must bind `0.0.0.0:3000`.

**Why:** Replit proxies the preview pane through a different origin; `localhost` resolves differently inside the container.

## pg package not bundled — must install explicitly
- Task #2 (database migration) added `pg` as a runtime import in `server/storage.ts` but did not add it to `package.json` before merging.
- Fix: `installLanguagePackages({ language: "nodejs", packages: ["pg", "@types/pg"] })`.

**Why:** The task agent wrote the code but the package install step was missed. Post-merge script now runs `npm install` to catch this going forward.

## Database schema must be created manually on first run
- `server/storage.ts` calls `seedDatabase()` on module load; it expects all tables to already exist (no auto-migration).
- Schema lives in `scripts/post-merge.sh` — run it or execute the SQL via `executeSql()` when setting up a fresh environment.
- Tables: `seed_status`, `users`, `profiles`, `jobs`, `job_applications`, `contracts`, `milestones`, `reviews`, `portfolio_items`, `notifications`, `messages`, `contract_reports`, `disputes`.

**Why:** There is no ORM or migration framework; schema is applied by the post-merge script.

## Post-merge script location
- Configured at `scripts/post-merge.sh`, registered via `setPostMergeConfig({ scriptPath: "scripts/post-merge.sh", timeoutMs: 120000 })`.
- Script: runs `npm install`, then applies schema via `node -e` + `pg` pool.
