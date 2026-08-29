---
name: Session-store test tables
description: PostgreSQL test-table naming behavior in connect-pg-simple
---

When creating multiple temporary tables for connect-pg-simple tests in one PostgreSQL schema, do not rely on its bundled `createTableIfMissing` DDL for custom table names. The bundled SQL uses fixed constraint and index names, which can collide even when the table names are unique.

**Why:** A custom table's creation can fail with an already-existing `session_pkey` or index relation, preventing the pruning test from reaching its assertions.

**How to apply:** Create isolated test tables explicitly with unique constraint/index names, then instantiate the store with `createTableIfMissing: false`; keep the production store configuration unchanged.