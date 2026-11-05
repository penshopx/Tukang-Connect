---
name: Contract notification durability
description: Completion success and reliable delivery must remain independent across failures and restarts.
---

Treat completion notifications as durable work recorded inside the contract-completion transaction. Once completion commits, notification delivery failures must not change the API result into failure. Snapshot notification text before commit instead of depending on subsequent user or project reads.

**Why:** Previously a post-commit read or notification write could fail after completion statistics had changed, returning an API error while retries were rejected and reminders were lost.

**How to apply:** Preserve the transactional enqueue boundary when changing completion behavior. Database-backed notification delivery and acknowledging its pending event must commit together. If delivery later includes email or other external services, use provider idempotency keys rather than assuming a database transaction can undo external sends.
