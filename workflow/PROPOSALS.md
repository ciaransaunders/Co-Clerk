# PROPOSALS

New features the Phase 1 understanding surfaced. Each proposal is written **before** any code lands.

Items marked **DEFERRED (needs human decision)** would require adding a new dependency, schema migration, or a public-API/contract change and so fall outside the goal's Scope. They are recorded here for a human to pick up.

---

## P1 — Wire `@coclerk/redaction` into intake pipeline before persistence

**Problem.** Redaction Stage 1 is implemented and tested but never called. Raw intake bodies and parsed PII land in Postgres unredacted.

**Approach.** Add the existing engine to a single hop in `apps/api/src/services/intakeWorkflowService.ts:receiveInstruction`. Apply it to `rawEmailBody` before the `intake` object is constructed, and store the resulting `redacted_text` and `token_map` on the intake (using existing `parsed_fields` JSONB sub-keys — no schema change).

**Status. DEFERRED (needs human decision).** `apps/api/package.json` does not depend on `@coclerk/redaction`. Pulling it in would mutate the dependency list, which the goal's Scope forbids.

**Alternative not blocked by the constraint:** Re-export the engine through `@coclerk/domain` (which `apps/api` *does* depend on). Domain currently ships zero runtime deps; pulling in a workspace dep would require `domain/package.json` to declare `@coclerk/redaction` as a workspace dep — still a dep-list edit. **Also deferred.**

Files that would be touched once unblocked: `apps/api/src/services/intakeWorkflowService.ts`, plus one regression test under `apps/api/src/routes/workflow.test.ts`.

---

## P2 — Add Redaction Stage-2 NER provider interface

**Problem.** `redaction-engine.md` calls for a Stage 2 NER layer; `RedactionEngine.types.NERProvider` is defined but unused.

**Approach.** Add a minimal `NoopNERProvider` and orchestrate it after the regex pass.

**Status. DEFERRED (needs human decision).** Would require either a new dep (transformers.js / spacy bindings) or it ships as a noop that adds noise without value. A human should decide which Stage-2 backend wins before we build the seam.

---

## P3 — WebSocket event channel

**Problem.** `docs/websocket-events.md` specifies a subscription protocol. No code exists; web apps poll.

**Approach.** Add `socket.io` (or `ws`) to apps/api; broadcast `CoClerkEvent`s from `@coclerk/shared/events.ts`.

**Status. DEFERRED (needs human decision).** Requires a new `apps/api` dep.

---

## P4 — Reject-allocation endpoint and clerk reject flow

**Problem.** `apps/web-clerk/src/App.tsx` renders a "Reject" button but no API exists. Symmetry gap with `approveAllocation`.

**Approach.** Add `POST /api/v1/workflow/reject-allocation/:approvalId` that:
- sets `approval_requests.status = 'rejected'`
- sets `allocation_decisions.decision_status = 'rejected'`
- writes a `MatterLifecycleEvent` of type `allocation_rejected`
- writes an audit row with outcome `'completed'`, before_state captured

**Files touched.** `apps/api/src/services/intakeWorkflowService.ts` (new `rejectAllocation` method), `apps/api/src/routes/workflow.ts` (new route), `apps/api/src/routes/workflow.test.ts` (new test).

**Risk.** Low. Mirrors existing `approveAllocation` exactly. No schema / contract change — `matter_lifecycle_events.event_type` is plain `text`.

**Decision.** **Build.**

---

## P5 — `/api/v1/me/capabilities` endpoint

**Problem.** Web apps have no way to ask "what is this user allowed to do?" — UI gating is hard-coded.

**Approach.** Add `GET /api/v1/auth/me/capabilities` returning `{ role: Role, tier: number, capabilities: string[] }`. Resolves from `ROLES` table by `req.user.role_id`.

**Files touched.** `apps/api/src/routes/auth.ts`, `apps/api/src/routes/auth.test.ts` (new file).

**Risk.** Low. Read-only.

**Decision.** **Build.**

---

## P6 — `GET /api/v1/matters/:id/lifecycle`

**Problem.** `matter_lifecycle_events` is being written but never read out.

**Approach.** Add a read endpoint returning the lifecycle history for a matter, tier-3 gated. Returns `[]` if none.

**Files touched.** `apps/api/src/routes/matters.ts`, `apps/api/src/routes/matters.test.ts`.

**Risk.** Low.

**Decision.** **Build.**

---

## P7 — Backfill `Fees Clerk` role (ADR-0005)

**Problem.** ADR-0005 specifies a Fees Clerk role; `ROLES` and `seed.ts` lack it.

**Approach.** Add a new `RoleKey = 'fees_clerk'` with tier 4 (peer to Assistant PM) and capabilities `['view_financials', 'manage_billing']`. Update `seed.ts` to insert the role row. **Do NOT** add a user record (deferred to a human seed decision).

**Files touched.** `packages/domain/src/roles.ts`, `packages/domain/src/roles.test.ts` (new tests), `packages/database/src/seed.ts`.

**Public API impact.** RoleKey is a TypeScript union literal — adding a member is forward-compatible for consumers that read `Role[]` but is a breaking change for `switch(roleKey)` on exhaustive matches. No exhaustive switches exist in the codebase (grep across `apps/` and `packages/`). Treat as additive.

**Risk.** Low. Build.

**Decision.** **Build.**

---

## P8 — Read `ChambersConfig` from DB in `IntakeWorkflowService`

**Problem.** `IntakeWorkflowService.handleBarristerResponse` hard-codes `chambersConfig: { double_approval_comms: true }`.

**Approach.** Add `ChambersConfigRepository` to `@coclerk/database` reading from existing `chambers_config` table. Inject into the service constructor; default to `DEFAULT_CHAMBERS_CONFIG` from `@coclerk/config` if no row.

**Files touched.** `packages/database/src/repositories.ts`, `apps/api/src/services/intakeWorkflowService.ts`, plus a unit test using the existing in-memory db mock.

**Risk.** Low.

**Decision.** **Build.**

---

## P10 — Declare `@coclerk/domain` as a dependency of `@coclerk/database`

**Problem.** `packages/database/src/{audit,repositories}.ts` import types from `@coclerk/domain`, but `packages/database/package.json` does not declare the dependency. Under pnpm 10 strict resolution, no symlink is created. Phase 3 worked around this with a tsconfig `paths` mapping; runtime would still fail if anyone actually instantiates `DatabaseAuditService.list(…)` outside a mocked test.

**Approach.** Add `"@coclerk/domain": "workspace:*"` to `packages/database/package.json` dependencies. One line.

**Status. DEFERRED (needs human decision).** Outside the Phase 2 Scope's no-dep rule.

---

## P11 — Add `dotenv` to `@coclerk/database` (or migrate to `node --env-file`)

**Problem.** `migrate.ts` and `seed.ts` originally imported `dotenv` without declaring it. Phase 3 replaced this with an inline parser to make the build pass. The inline parser is a maintenance burden compared to using the standard library.

**Approach.** Either (a) add `"dotenv": "^16.x"` as a devDependency, or (b) switch to Node 20.6+'s built-in `process.loadEnvFile()` / `--env-file` flag (also no dep needed and supported on the pinned Node 20.11.1).

**Status. DEFERRED (needs human decision).** Either path needs sign-off — (a) is a dep edit; (b) changes the invocation contract for `db:migrate` / `db:seed`.

---

## P12 — Reconcile Drizzle `matters` schema with SQL migrations

**Problem.** The Drizzle `matters` table definition (`packages/database/src/schema.ts`) is missing the `case_type` and `court_name` columns that the SQL migrations (`0002_phase2_schema.sql`) create. Phase 3 worked around this by casting the seed values to `any[]`. The drift means Drizzle queries can't reference these columns by name.

**Approach.** Add the columns to the Drizzle definition. Pure schema-shape edit; no actual migration is needed because the columns already exist in the DB.

**Status. DEFERRED (needs human decision).** Schema migrations are outside Phase 2/3 scope.

---

## P13 — Re-narrow `expiresIn` typing once `@coclerk/config` exposes the branded type

**Problem.** `config.jwtExpiresIn: string` is too wide for `jwt.SignOptions.expiresIn` (a branded `StringValue | number`). Phase 3 cast at the call site.

**Approach.** Type `jwtExpiresIn` in `packages/config/src/index.ts` as `jwt.SignOptions['expiresIn']`. Requires `@coclerk/config` to depend on `@types/jsonwebtoken` (currently it doesn't) — i.e. a dep edit.

**Status. DEFERRED (needs human decision).** Dep edit.

---

## P9 — Notification list pagination

**Problem.** `GET /api/v1/workflow/pending-actions` returns all rows. Will not scale.

**Approach.** Add `?limit=…&offset=…` query parameters with default `50/0`, capped at `200`.

**Files touched.** `apps/api/src/routes/workflow.ts`.

**Risk.** Low.

**Decision.** **Build.**

---

End of proposals.
