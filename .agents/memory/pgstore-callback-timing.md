---
name: PGStore callback timing
description: Reliable timing strategy for connect-pg-simple integration tests using real PostgreSQL I/O
---

When a session-pruning integration test uses a real `connect-pg-simple` PGStore and PostgreSQL pool, use short real scheduler delays and await explicit Promise signals from the warning/recovery callbacks. Do not assume advancing fake timers also completes the database operation.

**Why:** PGStore resolves the pool query asynchronously and dispatches its callback through `process.nextTick`. Fake-timer advancement can run the scheduler timeout while returning before the real query and callback chain finish, causing false missing-recovery failures.

**How to apply:** Reserve fake timers for scheduler-only unit tests or fully mocked synchronous stores. For real PGStore integration tests, resolve Promises inside the observed callbacks, await those Promises, and stop the pruner in `finally`.