---
name: Cancelable query requests
description: Requirement for making TanStack Query cancellation stop browser network requests.
---

Query functions that perform network I/O must consume the `AbortSignal` supplied by TanStack Query and forward it to `fetch` or the shared request wrapper.

**Why:** Canceling or removing a query does not abort its underlying request automatically when the query function ignores the signal. During logout, such a request can outlive the session and return 401 even though the UI has already redirected.

**How to apply:** Whenever query cancellation is part of correctness—not only observer cleanup—pass the query context's signal through every network layer and test with a deliberately delayed in-flight request.