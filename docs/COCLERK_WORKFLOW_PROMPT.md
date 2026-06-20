# CoClerk — Dynamic Workflow Prompt (3 sequential teams)

> Paste the block below into a new Claude Code session opened **at the repo root** of CoClerk.
> Recommended launch: `/effort high`, dynamic workflow enabled (`/config`), permissions `acceptEdits`, run with `/goal`.
> **Before you start:** this repo is not yet under version control. Run `git init && git add -A && git commit -m "baseline before workflow"` so every phase can checkpoint and roll back.

---

## Goal
Run a single **dynamic workflow** over this CoClerk monorepo that executes three teams **strictly in sequence**, each handing off to the next via a shared state file:

1. **Understanding team** — map the codebase and produce an authoritative understanding artifact.
2. **Expanding/Improving team** — harden existing code, finish features already specified in the docs, AND design + build well-scoped new features that the understanding phase surfaced.
3. **Debugging/Fixing team** — drive the whole repo to a green, consistent state.

**Done** = all three phases complete, the deliverable artifacts below exist, and the repo passes `pnpm -r build`, `pnpm -r test`, and `tsc` with no errors — or the run hits the turn cap and reports cleanly.

## Scope
- **May edit:** everything under `apps/*` and `packages/*` source, co-located `*.test.ts` files, and the `docs/` tree. You may create new files within these.
- **May create (workflow artifacts):** `workflow/STATE.md`, `workflow/01-understanding.md`, `workflow/02-improvements.md`, `workflow/03-debug-log.md`, `workflow/PROPOSALS.md`.
- **Do NOT touch:** `pnpm-lock.yaml` / `package.json` dependency lists (no adding, removing, or upgrading deps), `docker-compose.yml`, `.env*`, `*.pdf`, CI/infra config, and the existing `.nvmrc` / engine pins.
- Never run destructive git (`reset --hard`, `push --force`, branch deletion) or `rm -rf`. Commit between phases; never amend earlier commits.

## Context (read first)
- `README.md`, `coclerk.md`, `AGENT.md` — what CoClerk is and the agent ground rules (pnpm + corepack, Node 20.11.1, tests co-located).
- `ARCHITECTURE.md`, `ARCHITECTURE_REVIEW.md`, `FEATURE_SPEC.md` — intended design and the feature surface.
- `docs/` — ADRs (`docs/adr/`), phase architectures, spikes, and component specs (redaction, conflict-checker, permission-matrix, channel-bridge, websocket-events).
- `TEST_FIXES.md`, `fix_plan.md` — known issues and prior fix intent; treat as leads, not gospel.
- Stack: pnpm workspace; apps = `api` (Express), `worker` (job queue), `web-clerk` + `web-barrister` (React/Vite); packages = `domain`, `redaction`, `workflow-engine`, `database` (Drizzle), `shared`, `ui`, `config`. Tests use Vitest. LLM + auth are deterministically mocked.

## Workflow structure — three teams in sequence

Maintain `workflow/STATE.md` as the single source of truth: current phase, what each phase concluded, and the handoff to the next. Each phase **must read the prior phase's artifact before starting** and append its own. Phases run one at a time; do not begin a phase until the previous one's artifact is written.

**Phase 1 — Understanding team (read-only).** Fan out read-only subagents (Explore) across apps and packages in parallel. Produce `workflow/01-understanding.md`: module map and responsibilities, data model + key flows (request → permission → workflow-engine → worker), how the mocks are wired, dependency graph between packages, and a ranked list of (a) gaps vs. the docs/spec, (b) quality/risk hotspots, (c) candidate improvements and net-new features with rough effort/risk. **Edit no source in this phase.**

**Phase 2 — Expanding/Improving team.** Working only from the Phase 1 ranked list:
- Harden existing code (types, error handling, missing tests, dead code, spec drift).
- Finish features already specified in `FEATURE_SPEC.md` / `docs/` that are incomplete.
- Design and build **new** features the understanding phase surfaced — but each new feature must be: written to `workflow/PROPOSALS.md` first (problem, approach, files touched, risk), kept within the Scope above, and shipped **with tests**. Skip any proposal that would need a new dependency, a schema migration, or a public-API/contract change — record it as "deferred (needs human decision)" instead of building it.
- Use a fresh subagent per substantial work item so contexts stay clean; record each completed item in `workflow/02-improvements.md`. Commit after each coherent unit of work.

**Phase 3 — Debugging/Fixing team.** Bring the repo green: run `pnpm -r build`, `pnpm -r test`, and `tsc` (use a subagent for each noisy run so logs stay out of the main context), then fix failures — including any introduced in Phase 2 — until all pass. Log root cause + fix per failure in `workflow/03-debug-log.md`. Do not delete or skip a failing test to make it pass; fix the cause or, if the test itself is wrong, document why before changing it.

## How to verify (machine-checkable, gates completion)
From repo root, all must succeed with zero errors:
- `corepack enable && pnpm install`
- `pnpm -r build`
- `pnpm -r test`
- `pnpm --filter @coclerk/redaction test` (Stage 1 regex tests pass)
- `npx tsc --noEmit` clean across the workspace
- All five `workflow/*.md` artifacts exist and `STATE.md` shows all three phases complete.

## Constraints
- **Hard rule:** add no new dependencies and make no schema migrations or public-API/contract changes — defer any such idea to `PROPOSALS.md` for a human.
- Follow `AGENT.md`: pnpm throughout, Node 20.11.1, tests co-located as `*.test.ts`.
- No destructive git or filesystem ops; commit between phases so each is a rollback point.
- Stay inside the declared Scope; do not refactor `web-clerk`/`web-barrister` UI wholesale unless a Phase 1 hotspot justifies it.
- Run **fully autonomous**: do not stop to ask. If genuinely blocked or a step is irreversible/out-of-scope, record it in `STATE.md` and continue with the next safe item rather than halting.
- **Turn cap:** stop after 60 turns even if incomplete, and write a final status (done / remaining / deferred) to `STATE.md`.

## Suggested settings
`/effort high` (adaptive thinking), dynamic workflow on, `acceptEdits` permissions, launched via `/goal "all three workflow phases complete and pnpm -r build, pnpm -r test, and tsc --noEmit all pass — or 60 turns reached"`. Each phase uses subagents for parallel reads and noisy test/build runs.
