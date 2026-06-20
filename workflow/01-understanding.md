# Phase 1 — Understanding

Read-only map of the CoClerk monorepo. Source files in `apps/` and `packages/` totalling ~60 TS/TSX modules. Authority for this artifact: source files at HEAD on `main`, plus `docs/`, `ARCHITECTURE*.md`, `FEATURE_SPEC.md`, `TEST_FIXES.md`, `fix_plan.md`.

## 1. Module map

### Apps

| Package | Role | Key files |
|---|---|---|
| `@coclerk/api` (apps/api) | Express 4 gateway. JWT auth, RBAC middleware, mounts six v1 routers. Health endpoint pings Postgres. Graceful SIGTERM/SIGINT shutdown. | `src/index.ts`, `src/middleware/{authMiddleware,errorHandler,requestLogger}.ts`, `src/routes/{auth,matters,diary,notifications,allocation,workflow}.ts`, `src/services/{intakeWorkflowService,conflictChecker}.ts` |
| `@coclerk/worker` (apps/worker) | Skeleton background job runner. Single demo handler `ExampleNotificationJob`. No queue backend wired. | `src/{index,jobQueue}.ts` |
| `@coclerk/web-clerk` | React 18 + Vite SPA. Clerk desktop. Login → Dashboard with intakes and approvals fetched via fetch(). | `src/{App,index}.tsx` |
| `@coclerk/web-barrister` | React 18 + Vite mobile-shell SPA. Login → Inbox (accept/decline). | `src/{App,index}.tsx` |

### Packages

| Package | Role | Key files |
|---|---|---|
| `@coclerk/domain` | Pure type/logic core. Roles + capability table, RBAC `hasPermission`, risk tier engine, audit service interface + in-memory mock, entity types (matters/diary/intake/notifications/allocation/contacts/cms/approvals). No runtime deps. | `src/*.ts` |
| `@coclerk/database` | Postgres data layer. Drizzle schema, pg Pool client, repositories (Intake/Matter/Approval/Notification/AllocationDecision/Diary/GeneralMetrics/User), `DatabaseAuditService`. Includes `migrate.ts`, `seed.ts`, raw `schema.sql` + phase 2/3 SQL migrations. | `src/{schema,client,repositories,audit,migrate,seed}.ts` |
| `@coclerk/redaction` | Stage 1 reversible regex redaction (postcode, phone, email, case-ref, NINO, DOB, URL). 14 passing tests. Stage 2 NER stubbed in types only. | `src/{engine,types,index,engine.test}.ts` |
| `@coclerk/workflow-engine` | `BasicWorkflowEngine` skeleton with `startWorkflow`/`resumeWorkflow`. Console-only. | `src/index.ts` |
| `@coclerk/shared` | Cross-cutting types (events). No code, no tests yet. | `src/{events,index}.ts` |
| `@coclerk/ui` | React `AuthProvider` + `useAuth` hook (localStorage-backed). Single context, no design tokens shipped. | `src/AuthContext.tsx` |
| `@coclerk/config` | `AppConfig` (`getAppConfig()` env reader) and `ChambersConfig` defaults. No tests. | `src/index.ts` |

## 2. Data model + key flows

### Postgres schema (Drizzle, packages/database/src/schema.ts)
Core tables: `roles`, `users`, `matters`, `instruction_intakes`, `conflict_checks`, `allocation_suggestions`, `notification_queue`, `approval_requests`, `allocation_decisions`, `matter_lifecycle_events`, `diary_entries`, `chambers_config`, `audit_log`. Enums for `review_status`, `conflict_result`, `matter_status` are defined but the actual `matters.status` column is plain `text`, not the enum — minor schema drift. JSONB used for `matched_matter_ids`, `explanation`, `inputs_snapshot`, `ranked_candidates`, `payload`, `metadata`, `capabilities`.

### Request lifecycle
```
Client (web-clerk | web-barrister)
   │  fetch /api/v1/* with Bearer <jwt>
   ▼
Express app (apps/api/src/index.ts)
   │  cors → json → requestLogger
   ▼
Router (auth | matters | diary | notifications | allocation | workflow)
   │  requireAuth → jwt.verify → UserRepository.findById
   │  requireTier(N, capability?) → ROLES → hasPermission
   ▼
Handler
   │  determineRiskTier({actionType, …})
   │  if 'high'  → audit('pending_confirmation') → 202
   │  if 'low'   → mutate → audit('completed')
   ▼
@coclerk/database (Pool.query OR Repository.save)
   │
   ▼  (for intake slice only)
IntakeWorkflowService
   ├── receiveInstruction:    intakeRepo + matterRepo + audit + conflictChecker (queries matters table) + metricsRepo + notificationRepo
   ├── handleBarristerResponse(notif, accept|decline|concern): notification.acted_at + audit + decisionRepo + approvalRepo (high risk)
   └── approveAllocation(approvalId): approval.status='approved' + decision.confirmed + matter.assigned_barrister_id + matter.status='instructed' + diaryRepo.save + lifecycleEvent + audit
```

### Permission model
`packages/domain/src/roles.ts` defines six roles with tiers 0–5 plus capability lists. `hasPermission(role, requiredTier, requiredCapability?)`:
- If `requiredCapability` is set, capability is the sole criterion (barristers can pass via own-diary capabilities; clerks fail without it).
- Otherwise barristers (tier 0) always denied for clerk routes; clerks pass if `tier <= requiredTier`.

### Mock wiring
- **JWT auth**: real `jsonwebtoken.sign`/`verify` over `config.jwtSecret` (defaults to `'coclerk-dev-secret-do-not-use-in-production'`). `bcryptjs.compare` against `users.password_hash`.
- **LLM**: nothing actually calls an LLM. `IntakeWorkflowService.receiveInstruction` writes a hard-coded `parsedFields` object (`employment_tribunal` / `London Central` / `MegaCorp` / `Jane Smith`) with confidence 0.95. Allocation `ranked_candidates` are two hard-coded barristers with fixed scores.
- **Database in tests**: `apps/api/src/routes/workflow.test.ts` uses an inline `jest.mock('@coclerk/database', () => …)` factory that holds an in-memory `memoryDb` object. Other API tests only call `determineRiskTier` / `MockAuditService` — they never touch a route handler.
- **Auth mock**: `packages/domain/src/auth.ts` exports `authenticateMock(token)` accepting `'dev-clerk'` and `'dev-barrister'` literals. It is **not** referenced anywhere — the real `requireAuth` middleware uses `jwt.verify` + `UserRepository`. Dead code candidate.

## 3. Dependency graph (workspace packages)

```
@coclerk/api        ← @coclerk/domain, @coclerk/database, @coclerk/config, @coclerk/workflow-engine
@coclerk/worker     ← @coclerk/domain, @coclerk/database, @coclerk/workflow-engine
@coclerk/web-clerk  ← @coclerk/domain, @coclerk/shared, @coclerk/ui
@coclerk/web-barrister ← @coclerk/domain, @coclerk/shared, @coclerk/ui

@coclerk/database   ← @coclerk/shared, (uses @coclerk/domain types in repositories.ts/audit.ts — NOT declared in package.json deps)
@coclerk/redaction  ← (nothing)
@coclerk/workflow-engine ← (nothing)
@coclerk/domain     ← (nothing)
@coclerk/shared     ← (nothing)
@coclerk/ui         ← react
@coclerk/config     ← (nothing)
```

Note: `apps/api/src/services/intakeWorkflowService.ts` imports `@coclerk/redaction`-like masking? No — it does not. Redaction is not yet wired into the intake pipeline. The redaction-engine.md spec calls for it before any LLM hop, but no LLM hop exists yet.

## 4. Gaps vs. docs/spec

| # | Where | Finding | Severity |
|---|---|---|---|
| G1 | `redaction-engine.md` §6 vs. `intakeWorkflowService.ts` | Redaction engine is implemented and tested but never invoked. The intake parser writes raw `parsed_fields` (incl. opponent/client names) straight to Postgres. | Medium |
| G2 | `conflict-checker.md` two-pass tier-1 spec | Implemented in `apps/api/src/services/conflictChecker.ts` (passes 1+2). Spec calls for a Pass 3 (client name match) — absent. | Low |
| G3 | `permission-matrix.md` Fees Clerk role (ADR-0005) | Not in `ROLES` table or seed data. | Medium |
| G4 | `websocket-events.md` | No WebSocket server is implemented. The `apps/api/src/index.ts` mounts only HTTP routers. Web apps poll via `fetch`. | Medium |
| G5 | `channel-bridge-security.md` | No channel-bridge code exists; events defined in `@coclerk/shared/events.ts` (`ChannelBridgeMessageReceivedEvent`) have no producers/consumers. | Low (deferred design) |
| G6 | LPP classification (ADR-0007) | `Matter.has_lpp_data` field exists and is always `false` in the mock intake. No classifier logic; no LPP gating in `requireTier`. | Low |
| G7 | `ARCHITECTURE.md` schema vs. actual | `matters.status` typed `text` instead of `matter_status` enum; `matters.has_lpp_data` exists in the type but the Drizzle schema doesn't include it (`packages/database/src/schema.ts` matters table lacks `has_lpp_data` — wait, it does at line 35). Confirmed present. False alarm. | — |
| G8 | `intakeWorkflowService.ts` parse confidence | Domain type `InstructionIntake.parse_confidence: number` (decimal 0–1). Service writes `0.95`. Seed writes `95`. Schema column is `integer`. Drift. | Low |
| G9 | Diary route lifecycle | `diary.ts POST /` correctly returns 202 on high-risk. But the **non-high-risk branch will never run** because `determineRiskTier` classifies all `diary_modification` as 'high'. So the route can only ever 202 — never insert a diary entry. | Medium |
| G10 | `allocation.ts` | Routes return empty in-memory arrays (`suggestionsDb`, `decisionsDb`, `logsDb` are `[]` and never populated by any code path). The real allocation suggestions come from `IntakeWorkflowService` and are written to Postgres, not these arrays. | Medium (dead module) |
| G11 | `notifications.ts` | Same — empty `notificationDb`. The barrister inbox actually polls `/api/v1/workflow/pending-actions`, not `/api/v1/notifications/`. | Low (dead module) |
| G12 | `apps/api/src/routes/auth.ts` logout | Server-side no-op (correct for stateless JWT) but no token revocation / blacklist. ADR-0008 implies session management. | Low |
| G13 | `apps/api/src/index.test.ts` | `it()` asserts `true === true`. Not a meaningful test. | Low |
| G14 | `packages/domain/src/auth.ts` `authenticateMock` | Never imported. Dead code. | Low |
| G15 | Phase 3 mock test in `workflow.test.ts` | Hand-rolled in-memory mock duplicates table semantics in the file body; brittle. | Low (cleanup target) |

## 5. Quality / risk hotspots

| # | Where | Issue |
|---|---|---|
| H1 | `apps/worker`, `apps/web-clerk`, `apps/web-barrister`, `packages/database` | No local `tsconfig.json`. Each has `build: tsc` (or `tsc && vite build`). `tsc` in those dirs will fail with "Cannot find a tsconfig.json file." This blocks `pnpm -r build`. **Phase 3 top priority.** |
| H2 | `apps/api/jest.config.js` moduleNameMapper | Lists `domain`, `database`, `config`, `workflow-engine`. Missing `shared` and `redaction`. Today no test crosses those — but it's a latent blast radius when tests grow. |
| H3 | `packages/database/src/audit.ts` `DatabaseAuditService.log` | Risk_tier / outcome stored inside a `changes` JSONB blob (because the `audit_log` table column is named `changes`, not `risk_tier`/`outcome`). The `list()` method reads them back. Two-way translation works but the schema and the domain type diverge — refactor candidate. |
| H4 | `apps/api/src/services/conflictChecker.ts` Pass 2 | `LIKE '%${solicitorFirm}%'` against `solicitor_details::text` (whole JSONB serialized). High false-positive surface — substring match collides with addresses, IDs, anything containing the firm name. |
| H5 | `apps/api/src/routes/diary.ts` | Mass-assignment is correctly handled (explicit field pick), but the `400` validation runs **after** the audit log writes a `pending_confirmation` for the high-risk branch. Order of operations is wrong: invalid input still produces an audit row. |
| H6 | `apps/api/src/index.ts` graceful shutdown | `setTimeout(force exit)` fires regardless of `server.close` callback. The `unref()` is missing — process hangs an extra 10s on every clean shutdown. |
| H7 | `apps/api/src/middleware/authMiddleware.ts` | `jwtSecret` defaults to `'coclerk-dev-secret-do-not-use-in-production'` when env var unset. Acceptable for dev; should at least warn on first auth attempt in non-dev `NODE_ENV`. |
| H8 | `apps/api/src/routes/auth.ts` | Imports `requireAuth` mid-file (line 46) after the `/login` handler. Style nit but disrupts readability. |
| H9 | `packages/redaction/src/engine.ts` | Iterates rules in source order with no overlap detection across categories. Mixed-category overlaps could double-redact (e.g. an email containing a postcode-shaped fragment). Skip-check `if (match.startsWith('[') && match.endsWith(']'))` is a partial guard but DOB regex `\b\d{1,2}[\s/\-.]…` will eat embedded numbers. |
| H10 | `packages/redaction/src/engine.ts` DOB regex | `01/02/1990` matches but `01-02-90` does too — and so does `12 December 1234567`. Edge bounds are sloppy. Acceptable for Stage 1; flag for tightening. |
| H11 | `packages/database/src/seed.ts` | `await db.delete(…)` chain not wrapped in a transaction. A failure half-way leaves partial state. |
| H12 | `apps/api/src/routes/workflow.ts:25` | `JSON.parse(suggestion.ranked_candidates)`. If pg driver already returns parsed JSONB (default for `node-postgres` + `jsonb`), this throws. Inconsistent with `repositories.ts:101` which DOES `JSON.stringify(s.ranked_candidates)` before insert. |
| H13 | No tests cross `apps/api` routes end-to-end | `index.test.ts` is a placeholder; supertest isn't installed (deliberately per TEST_FIXES). Route auth, error handler, and tier middleware are uncovered. |
| H14 | `apps/web-clerk` + `apps/web-barrister` `index.css` | 42 bytes each; `App.tsx` references `cc-card`, `cc-button`, `cc-sidebar`, `cc-bottom-nav`, `cc-badge`, … none of which can possibly be defined in 42 bytes. UI is unstyled at runtime. |
| H15 | `packages/database/src/schema.sql` and `0002`/`0003` SQL files | Hand-written alongside the Drizzle schema. Drift risk: which is canonical? `ADR-0006` chose Drizzle migrations; the SQL files may be legacy. |
| H16 | `packages/ui/package.json` | Declares `./style.css` export pointing to `./index.css` which **does not exist** in the package. Build / consumer import will fail. |
| H17 | `apps/api/src/services/intakeWorkflowService.ts:154` `chambersConfig: { double_approval_comms: true }` is hardcoded — should read from `chambers_config` table via a repository. |

## 6. Candidate improvements & new features

Ordered by (value × tractability) ÷ risk. Each row: ID — title — effort (S/M/L) — risk (L/M/H) — net-new vs harden.

| ID | Title | Effort | Risk | Type | One-line scope |
|---|---|---|---|---|---|
| I1 | **Add tsconfig.json to four packages so `pnpm -r build` succeeds** | S | L | Harden | Create local tsconfig in apps/worker, apps/web-clerk (incl. JSX + DOM), apps/web-barrister, packages/database. |
| I2 | **Fix high-risk diary route audit-before-validation ordering** | S | L | Harden | In `apps/api/src/routes/diary.ts`, validate input before risk-tier branch. Add tests. |
| I3 | **Fix `setTimeout` shutdown leak** | S | L | Harden | `.unref()` the force-exit timer so clean shutdown is immediate. |
| I4 | **Tighten / dedupe redaction overlap handling** | S | L | Harden | Replace the rule-order skip hack with a sorted-by-position non-overlap reducer. Add 2 tests for overlap cases. |
| I5 | **Wire redaction engine into intake pipeline** | M | L | Finish spec | In `IntakeWorkflowService.receiveInstruction`, run `engine.redact(rawEmailBody, level)` before storing parsed_fields. Store `body_redacted` in domain `Message` type (already defined). Add test. **Requires moving `@coclerk/redaction` into `apps/api/package.json` deps — DEFER (new dep).** |
| I6 | **Wire `@coclerk/redaction` into existing api code through `@coclerk/domain`** | M | L | Finish spec | Move redaction-usage to a domain service that the api can consume via existing `@coclerk/domain` dep. Avoids the dep-list edit constraint. |
| I7 | **Delete dead `authenticateMock`** | S | L | Harden | Remove `packages/domain/src/auth.ts`; export removed from index. |
| I8 | **Delete dead `allocation.ts` + `notifications.ts` in-memory dbs** | S | L | Harden | Replace empty arrays with queries against the real tables (mirrors the workflow router). |
| I9 | **Pass-3 conflict check (client name match)** | S | L | Finish spec | Add a third pass to `conflictChecker.ts` mirroring spec §3.3. Add tests. |
| I10 | **Tighten conflict-check Pass 2 to avoid substring collisions** | S | M | Harden | Switch from `LIKE '%X%'` on `solicitor_details::text` to a JSONB key lookup on `solicitor_details->>'firm'`. |
| I11 | **Cover route handlers without supertest** | M | L | Harden | Use `node:http` raw test client or inject `app.handle(req, res)`. Add tests for `/health`, `requireAuth` 401, `requireTier` 403, `/auth/login` success+fail. |
| I12 | **Reconcile `parse_confidence` int vs decimal** | S | L | Harden | Domain type → integer percent; service writes `95`; everything aligns. Schema is already int. |
| I13 | **Fix `JSON.parse(suggestion.ranked_candidates)` double-parse bug** | S | L | Harden | pg returns jsonb already-parsed. Remove the `JSON.parse` in workflow router. Add a regression test. |
| I14 | **Read `chambersConfig` from DB in IntakeWorkflowService** | M | L | Finish spec | Add `ChambersConfigRepository` and inject into the service. |
| I15 | **Fix `@coclerk/ui` missing CSS export** | S | L | Harden | Drop the broken `./style.css` export, or ship a minimal `index.css`. |
| I16 | **Add a real `/api/v1/health/deep` that probes redaction + workflow engine** | S | L | Net-new | Cheap diagnostic. |
| I17 | **Approve / reject endpoint symmetry** | S | L | Finish spec | The clerk UI exposes a "Reject" button but no endpoint exists. Add `POST /workflow/reject-allocation/:approvalId`. |
| I18 | **Notification cursor / pagination on `/workflow/pending-actions`** | S | L | Net-new | Trivial `LIMIT/OFFSET`. |
| I19 | **`/api/v1/me/capabilities` endpoint** | S | L | Net-new | Returns the user's role + capability list. Drives client-side gating. |
| I20 | **Audit log search endpoint** | M | M | Net-new | `GET /api/v1/audit?entity_type=&entity_id=` with tier-3 gate. |
| I21 | **Stage-1 redaction CLI in `@coclerk/redaction`** | S | L | Net-new | Tiny `bin` script. **Skip if it needs new deps.** |
| I22 | **Lifecycle event listing per matter** | S | L | Net-new | `GET /api/v1/matters/:id/lifecycle`. |
| I23 | **Schema enum alignment for `matters.status`** | S | M | Harden | Switch column from `text` to `matter_status` enum. **DEFER — schema migration.** |
| I24 | **WebSocket events** | L | M | Finish spec | Out of scope under constraints (would need a new dep). DEFER to PROPOSALS.md. |
| I25 | **Fees Clerk role + capabilities** | S | L | Finish spec | Add role to `ROLES` + seed. Doesn't change wire contract. |
| I26 | **Wrap `seed.ts` in a transaction** | S | L | Harden | One `await db.transaction(async tx => …)` block. |

## 7. Phase 2 plan summary (for the next phase)

Do all of: **I1, I2, I3, I4, I7, I8, I9, I10, I12, I13, I15, I17, I19, I22, I25, I26**.

Try opportunistically: **I6** (route the redaction call through the existing `@coclerk/domain` dep so the dep-list isn't touched), **I11** (raw-http test client; no new dep).

Defer to PROPOSALS.md: **I5** (needs new dep on `apps/api`), **I21** (CLI may need shebang infra), **I23**, **I24** (websocket needs new dep / migration).

Skip: anything below value threshold not listed above.

---

End of Phase 1 artifact.
