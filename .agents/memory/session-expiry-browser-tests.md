---
name: Session-expiry browser tests
description: Timing boundaries for reliable mounted-page session-expiry and request-cancellation tests.
---

Trigger simulated expiry explicitly after the private page has loaded, not after a fixed number of session requests. Measure the absence of new private requests after the client processes the expired-session response, not when the mock server starts sending it.

**Why:** React StrictMode can abort and repeat startup requests. Advancing browser timers can also start a notification request while the session-check response is still being processed. Neither means a request was sent after the client knew the session was gone.

**How to apply:** Wait for visible private data and the intended pending request before simulating expiry. Assert that pending requests abort and private data disappears, then advance polling timers and attempt back navigation. For a private 401, distinguish cancelled initial requests from retries after redirect instead of requiring exactly one attempted request.

Mocked authentication must include mocks for the page's private data requests, unless the test also establishes a real backend session.

**Why:** Returning a user only from the mocked session endpoint does not authenticate real backend requests. Their legitimate 401 responses can end the simulated session and make an unrelated logout assertion fail.

**How to apply:** Keep the session check and private endpoint fixtures consistent. Use a broad API fixture with explicit per-test overrides for isolated session tests, or authenticate against the actual backend throughout.
