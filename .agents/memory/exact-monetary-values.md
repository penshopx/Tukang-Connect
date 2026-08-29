---
name: Exact monetary values
description: Contract for preserving every digit of persisted monetary amounts backed by PostgreSQL BIGINT.
---

Persisted monetary amounts backed by PostgreSQL `BIGINT` must cross database, API, and UI boundaries as canonical positive decimal strings. Safe integer numbers may be accepted only as compatibility input; unsafe numeric inputs must be rejected because their original digits are already unrecoverable.

**Why:** JavaScript `number` cannot represent every integer above `Number.MAX_SAFE_INTEGER`, so coercion can silently alter contract, project, application, or milestone values.

**How to apply:** Use `BigInt`-based helpers for comparisons, sums, differences, sorting, and percentage allocation. Never pass persisted money through `Number()`. Keep derived zero or signed values separate from the positive persisted-money contract.