# Phase 2 — Expanding / Improving

This phase implemented every improvement that fit inside the goal's Scope (no new deps, no schema migrations, no public-API/contract changes). Items requiring those are tracked in [PROPOSALS.md](PROPOSALS.md) instead.

Cross-references use the IDs introduced in [01-understanding.md §6](01-understanding.md).

## Block A — Build foundation (unblocks Phase 3)

| ID | What | Files |
|---|---|---|
| I1.a | Add `apps/worker/tsconfig.json` (node target, extends root) | apps/worker/tsconfig.json |
| I1.b | Add `apps/web-clerk/tsconfig.json` (standalone; jsx + DOM lib; `noEmit`; excludes tests) | apps/web-clerk/tsconfig.json |
| I1.c | Add `apps/web-barrister/tsconfig.json` (same pattern) | apps/web-barrister/tsconfig.json |
| I1.d | Add `packages/database/tsconfig.json` | packages/database/tsconfig.json |
| I1.e | Add `vite-env.d.ts` references in both web apps so `import './index.css'` typechecks | apps/web-{clerk,barrister}/src/vite-env.d.ts |
| I15 | **Reverted** — Phase 1 audit reported `@coclerk/ui` exported a missing `./style.css`. Closer inspection showed `packages/ui/index.css` (5.2 KB of `.cc-*` styles) is present; the export is valid. No change shipped. |

## Block B — Correctness hardening

| ID | What | Files |
|---|---|---|
| I2 | Diary route validates input **before** any audit write so invalid input never produces an audit row. Also reuses the entry id for the audit `entity_id` on the high-risk branch. | apps/api/src/routes/diary.ts |
| I3 | Shutdown timer is `.unref()`ed so a clean SIGTERM exits immediately instead of hanging 10s. | apps/api/src/index.ts |
| I4 | Redaction engine rewritten as collect → sort → non-overlap select → token-assign. Earliest start wins, longer match wins on tie. Two regression tests added covering overlap defense and per-category counter stability. | packages/redaction/src/engine.ts, packages/redaction/src/engine.test.ts |
| I12 | Parse confidence written as integer percent (95) — matches the schema column type and seed data. | apps/api/src/services/intakeWorkflowService.ts |
| I13 | `JSON.parse(suggestion.ranked_candidates)` replaced with a polymorphic count that handles both already-parsed jsonb arrays (pg default) and legacy text rows. | apps/api/src/routes/workflow.ts |

## Block C — Dead-code cleanup

| ID | What | Files |
|---|---|---|
| I7 | Deleted `packages/domain/src/auth.ts` (`authenticateMock` had zero callers). Removed from `src/index.ts`. | packages/domain/src/auth.ts (deleted), packages/domain/src/index.ts |
| I8.a | `apps/api/src/routes/notifications.ts` — replaced empty in-memory store with a real `SELECT FROM notification_queue WHERE user_id = $1 ORDER BY scheduled_for DESC` query. | apps/api/src/routes/notifications.ts |
| I8.b | `apps/api/src/routes/allocation.ts` — replaced two empty in-memory stores. `/suggestions` now queries `allocation_suggestions`; `/logs` returns relevant `audit_log` rows for allocation actions, gated to tier 2. | apps/api/src/routes/allocation.ts |

## Block D — Finish spec'd features

| ID | What | Files |
|---|---|---|
| I9 | Added Pass-3 ("Client Cross-Reference") to the conflict checker — flags matters whose title contains the new client name as `possible_conflict`. Skips matters already matched by Pass 1 or 2. | apps/api/src/services/conflictChecker.ts |
| I10 | Tightened Pass-2 from `LIKE` over the entire serialized JSONB blob to a `solicitor_details->>'firm'` key lookup with `COALESCE` so NULL JSONB doesn't error. | apps/api/src/services/conflictChecker.ts |
| P7 | Added `fees_clerk` to the RoleKey union and `ROLES` table (tier 4; caps: view_financials, manage_billing, approve_fee_note). Added `roles.test.ts` cases. Added seed row in `seed.ts`. Index `rolesData[5]` (barrister) preserved by appending at end. | packages/domain/src/roles.ts, packages/domain/src/roles.test.ts, packages/database/src/seed.ts |
| P8 | `loadChambersConfig()` helper in `IntakeWorkflowService` reads `chambers_config` from the database with safe fallback to defaults. Replaces the previous hardcoded `{double_approval_comms: true}` stub. | apps/api/src/services/intakeWorkflowService.ts |
| I26 | `seed.ts` body wrapped in a single `db.transaction(async (tx) => {…})`. All `db.delete` / `db.insert` calls converted to `tx.*`. A half-failed seed now leaves no partial rows. | packages/database/src/seed.ts |

## Block E — New features (designed in PROPOSALS.md, built here)

| ID | What | Files |
|---|---|---|
| P4 | `POST /api/v1/workflow/reject-allocation/:approvalId` — symmetric with approve. Sets approval+decision to `rejected`, writes high-risk audit row with reason. Added `IntakeWorkflowService.rejectAllocation`. Test added covering the end state. | apps/api/src/routes/workflow.ts, apps/api/src/services/intakeWorkflowService.ts, apps/api/src/routes/workflow.test.ts |
| P5 | `GET /api/v1/auth/me/capabilities` — returns `{role, name, tier, capabilities}` for the authenticated user. Drives client-side gating without exposing the full RBAC table. | apps/api/src/routes/auth.ts |
| P6 | `GET /api/v1/matters/:id/lifecycle` — returns `matter_lifecycle_events` rows for the matter, newest first. | apps/api/src/routes/matters.ts |
| P9 | `/workflow/pending-actions` accepts `?limit` (default 50, capped 200) and `?offset` (default 0, min 0). Adds `ORDER BY scheduled_for DESC` for stable paging. | apps/api/src/routes/workflow.ts |

## Items deferred to PROPOSALS.md (human decision needed)

- **P1, P2, P3** — would require a new dependency. Documented but not built.
- **I23, I24** — schema migration / new dep.

## What did NOT get built

- **I11** ("cover route handlers without supertest") — scoped out for time. Existing tests still cover the high-value workflow service. Real route-level coverage will need a separate effort.
- **I5** (wire redaction into intake) — deferred to PROPOSALS.md (P1); needs dep edit.
- **I21** (redaction CLI) — would require a `bin` entry and dep changes.

---

End of Phase 2 artifact. Phase 3 (Debug / Fix) starts next; the build / test commands will surface any remaining gaps the Phase 1 audit missed.
