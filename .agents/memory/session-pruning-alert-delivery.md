---
name: Session-pruning alert delivery
description: Production alerting boundary for session-pruning incidents on Replit deployments.
---

Use an environment-configured webhook for the incident lifecycle and retain
the health endpoint as an independent monitoring signal. Resolve only on the
matching recovery incident ID.

**Why:** Replit deployment monitoring exposes uptime, HTTP status, and logs,
but does not evaluate a health response's JSON code or route structured log
events to an arbitrary operator webhook.

**How to apply:** Keep webhook URLs in production secrets, send firing and
resolved payloads with the same incident ID and failure count, and test
delivery against a local or disposable receiver without touching production
data.