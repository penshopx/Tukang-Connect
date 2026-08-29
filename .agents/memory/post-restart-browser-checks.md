---
name: Post-restart browser checks
description: Distinguishing transient Vite reconnect errors from application failures after a workflow restart
---

Run browser verification only after the restarted workflow is fully stable. A browser that remains open across the restart can record a transient Vite WebSocket handshake 502 even when the authenticated page and backend are healthy.

**Why:** A smoke check launched immediately after a workflow restart observed a single reconnect 502, while the dashboard remained authenticated and a repeat check after startup produced no new console errors or 5xx responses.

**How to apply:** After restarting the development workflow, confirm both frontend and backend startup logs are ready before attaching fresh browser console/network listeners and evaluating a reload.