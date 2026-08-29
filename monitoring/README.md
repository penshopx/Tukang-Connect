# Session-pruning production alert

This alert covers the case where the PostgreSQL-backed session cleanup keeps
failing. The application already exposes the incident in two ways:

- `GET /api/health` returns HTTP `503` with
  `code: "SESSION_PRUNING_UNAVAILABLE"` and the incident metadata.
- The server emits JSON events named
  `session_pruning_incident_started` and
  `session_pruning_incident_recovered`.

`monitoring/session-pruning-alerts.json` is the portable monitoring contract
for wiring these signals into the production alerting system.

## Production setup

1. Create the operator's incoming webhook in the alerting system. Keep the URL
   out of source control.
2. Store that URL as the production secret
   `SESSION_PRUNING_ALERT_WEBHOOK_URL`.
3. Republish the app after adding the secret so the production process receives
   it.
4. Configure the production monitor to request `/api/health` and treat only
   the JSON code `SESSION_PRUNING_UNAVAILABLE` as this alert. A database
   outage (`DB_UNAVAILABLE`) is a separate alert and must not be mislabeled as
   a pruning incident.
5. Route `SESSION_PRUNING_UNAVAILABLE` to the operator on-call channel.

The application sends the webhook when the structured start event is emitted,
so operators do not need to read logs continuously. The recovery event sends
the same `incidentId` with `status: "resolved"`; the alerting system should
close the firing alert only when that ID matches. Both firing and resolved
payloads contain `incidentId`, `consecutiveFailures`, and `failureCount`.

Replit's built-in deployment monitoring can show uptime, HTTP statuses, and
logs, and can email when the app is down. It does not natively evaluate JSON
response bodies or route structured log events to arbitrary webhooks. Use the
webhook notifier above plus an external monitor that can inspect the health
response when exact code matching is required. Do not treat a generic
HTTP-503 alert as proof that the database is unavailable.

## Safe verification procedure

Run the notifier tests locally:

```sh
npx vitest run server/__tests__/session-pruning-alerts.test.ts
```

Those tests use an in-memory event sequence, a fake sender, and a local HTTP
receiver to verify the real webhook transport; they do not connect to
PostgreSQL, call a real operator webhook, or mutate production data. The
existing session-pruning tests similarly use mocked stores for the alert
lifecycle. For a staging smoke test, point
`SESSION_PRUNING_ALERT_WEBHOOK_URL` at a disposable request inspector, induce
three mocked pruning failures, then verify:

1. exactly one `firing` notification is received;
2. it includes the incident ID and failure count;
3. a successful pruning attempt sends one `resolved` notification with the
   same incident ID; and
4. no production database or real operator channel was used.

If webhook delivery fails, the pruning scheduler continues retrying and logs
the incident ID and count for investigation.