---
name: Money invariant audits
description: Scope rules for auditing safe-integer monetary guarantees across the application.
---

When a project adopts a global monetary range, audit all persisted inputs, database reads, derived API outputs, aggregates, and direct SQL writes—not only the primary budget and contract routes.

**Why:** Secondary paths such as profile rates and cost calculators can violate the same guarantee even when core job, application, contract, and milestone paths are correct. Direct transaction queries can also bypass storage-level validation.

**How to apply:** Search broadly for money-like fields, arithmetic, aggregations, row mappers, and transaction inserts. Validate at both public route and storage boundaries, use exact arithmetic for sums/allocations, and test the minimum, maximum, first invalid value, and aggregate overflow.