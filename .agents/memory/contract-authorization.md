---
name: Contract authorization rules
description: Durable authorization and workflow rules for contract-related actions
---

Contract participation alone is not sufficient for contract mutations: each action must verify the actor's role and the resource's current workflow state. Clients own milestone creation and approval/rejection; workers submit work; signatures and lifecycle changes use dedicated server-controlled transitions.

**Why:** A participant-only check still allowed a worker to approve their own work or either party to forge signatures and contract status through generic update payloads.

**How to apply:** When adding contract, milestone, report, or message endpoints, authorize before dependent reads/writes, reject caller-controlled identity/lifecycle fields, and use an atomic expected-state guard for state transitions.

Serialize milestone creation and contract completion on the parent contract row, not just on existing milestone rows. Check child states in a separate query after acquiring the parent lock, and hold that lock through commit.

**Why:** Locking only existing children cannot protect an empty milestone set or prevent a concurrent insert. At READ COMMITTED, a fresh query after the parent lock sees inserts committed while waiting.

**How to apply:** Any new path that creates milestones or transitions an approved milestone back to an unfinished state must participate in the same parent-lock protocol; direct SQL paths need the same consideration.