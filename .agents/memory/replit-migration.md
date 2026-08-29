---
name: Replit migration (KerjaProyek)
description: Lessons from migrating this Vite+Express fullstack JS app from Replit Agent to Replit.
---

- **Vite HMR behind the Replit proxy**: must use `{ protocol: "wss", host: process.env.REPLIT_DEV_DOMAIN, clientPort: 443 }` — `clientPort: 443` alone makes Vite emit `ws://localhost:443`; pinning the host is required. Vite proxy target must be `http://127.0.0.1:3000` (not `localhost`) to avoid ECONNREFUSED.

- **Security-blocked deps**: the package firewall blocked `shell-quote@1.8.3` (via `concurrently`). Fix: replace the dep with a small `scripts/dev.mjs` spawner. **How to apply:** when a CVE blocks a transitive dep, find the single parent (`npm ls <dep>`) and replace/remove that parent.

- **OIDC client caching in tests**: `server/app.ts` caches the OIDC client in a module-level variable after the first `Issuer.discover()` call. To make the fake client's `callback()` configurable per test, expose the mock function via `vi.hoisted()` rather than overriding `Issuer.discover` in each test.

- **OIDC issuer override**: discovery must honor `process.env.ISSUER_URL`, with `https://replit.com/oidc` only as the fallback. **Why:** automated auth tests inject a local issuer; hardcoding production bypasses the test provider. **How to apply:** preserve this override during auth refactors.
