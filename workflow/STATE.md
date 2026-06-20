# Workflow State

Workflow: three sequential teams over the CoClerk monorepo.

## Current status
- **Phase 1 — Understanding:** COMPLETE (workflow/01-understanding.md)
- **Phase 2 — Expanding/Improving:** COMPLETE (workflow/02-improvements.md, workflow/PROPOSALS.md)
- **Phase 3 — Debugging/Fixing:** COMPLETE (workflow/03-debug-log.md)

## Final gates

```
pnpm -r build                      → green (10 packages, 0 failures)
pnpm -r test                       → green (37 tests across 5 packages, 0 failures)
pnpm --filter @coclerk/redaction test → green (16 ✓)
tsc --noEmit per package           → exit 0 for every package with a tsconfig
```

## Done / Remaining / Deferred

- **Done:** Every improvement that fits inside the goal's Scope. See [02-improvements.md](02-improvements.md).
- **Remaining:** None inside Scope. The two scoping caveats are noted in [02-improvements.md](02-improvements.md) §"What did NOT get built".
- **Deferred (needs human decision; recorded in PROPOSALS.md):**
  - P1 — wire redaction into intake (needs new dep on `@coclerk/api`)
  - P2 — Stage-2 NER provider (needs new dep)
  - P3 — WebSocket events (needs new dep)
  - P10 — declare `@coclerk/domain` as a dep of `@coclerk/database`
  - P11 — restore `dotenv` (or move to `node --env-file`)
  - P12 — reconcile Drizzle matters schema with SQL migrations (case_type, court_name)
  - P13 — narrow `expiresIn` typing in `@coclerk/config`

## Artifacts
- workflow/STATE.md (this file)
- workflow/01-understanding.md
- workflow/02-improvements.md
- workflow/03-debug-log.md
- workflow/PROPOSALS.md

## Hard rules in force throughout the run
- Add no new deps; do not edit pnpm-lock.yaml / package.json dependency lists.
- No schema migrations or public-API/contract changes; defer such ideas to PROPOSALS.md.
- No destructive git or filesystem ops. Commit between phases.
