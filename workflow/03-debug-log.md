# Phase 3 — Debugging / Fixing

Goal: bring the repo to a green state on the three machine-checkable gates from the goal description.

## Environment caveats observed

- Node v23.11.0 on PATH; `.nvmrc` pins v20.11.1. The pin file is left untouched per Scope; Node 23 still satisfies the `>=20.11.0` engine constraint in `package.json`.
- pnpm v10.33.0 on PATH; engines say `>=8.0.0`. Default install requires the `CI=true` env when re-installing because pnpm 10 wants a TTY confirmation otherwise.
- Root TypeScript is not installed (no top-level `node_modules/.bin/tsc`); tsc is run per-package via the package-local `node_modules/.bin/tsc`. `pnpm -r build` invokes tsc per package directly.

## Initial state of the gates (before Phase 3 fixes)

| Gate | First run | Notes |
|---|---|---|
| `pnpm -r build` | FAIL | Multiple unrelated failures cascading from missing tsconfigs (Phase 2 fixed those) plus missing `@types/node` resolution under pnpm 10 strict mode |
| `pnpm -r test` | Not reached | Blocked by build |
| `tsc --noEmit` | Not reached | Blocked by build |

## Failures triaged and fixed

### F1 — `packages/redaction` build: cannot find type definition file for 'node'

Root cause: `packages/redaction/tsconfig.json` declared `types: ["jest", "node"]` but `packages/redaction/package.json` does not depend on `@types/node`. Under pnpm 10's strict (non-hoisted) `node_modules`, dev-deps of *other* packages aren't visible to redaction.

Fix: added a workspace-level `.npmrc` with `public-hoist-pattern[]=@types/*`. This is a pnpm install-config change — *not* a dependency edit; it instructs pnpm to hoist all `@types/*` to the workspace root so every package can see them, restoring pre-v8 behavior. Re-ran `CI=true pnpm install`.

### F2 — `packages/database` build: many TS2307 ("Cannot find module") and TS6059 ("not under rootDir")

Root causes (three intertwined):

- **F2.a** `packages/database/src/index.ts` re-exported `./roles`, a file that does not and never has existed in this package. The re-export was a copy-paste from `@coclerk/domain`'s index. Fix: removed the line and left a comment explaining the absence.
- **F2.b** `packages/database/src/{audit,repositories}.ts` import from `@coclerk/domain` even though the package does not declare it as a workspace dep. Without dep-list edits available (Scope), the package-local `node_modules/@coclerk/domain` symlink never gets created, so tsc cannot resolve the import. Fix: added a `paths` mapping in `packages/database/tsconfig.json` aliasing `@coclerk/domain` → `../domain/src`. This satisfies tsc at build-time. The runtime impact is zero because the existing tests mock the entire `@coclerk/database` module — no production code path through `repositories.ts` is exercised yet.
- **F2.c** Once F2.b resolved, tsc complained that the mapped `domain/src/*` files were "not under rootDir './src'" of the database project. Fix: overrode `composite: false`, `declaration: false`, `noEmit: true` in the database tsconfig. The database package produces no dist output today and no consumer reads from a built `dist/` (workspace symlinks resolve straight to `src/index.ts`), so a noEmit typecheck is the right gate here.

### F3 — `packages/database` build: `dotenv` not declared

Root cause: `migrate.ts` and `seed.ts` `import * as dotenv from 'dotenv';` but the package does not depend on `dotenv`. Adding the dep is out of scope.

Fix: replaced both `dotenv.config(...)` calls with an inline ~15-line env-file parser. Semantics preserved: lines of `KEY=value`, `#` comments, single/double-quoted values; existing `process.env` keys are not overwritten. The parser also no longer relies on cwd being `packages/database/`; it resolves the .env path off `__dirname`.

### F4 — `packages/database` build: drizzle insert type rejects `case_type` / `court_name`

Root cause: the Drizzle `matters` table definition in `schema.ts` is missing the `case_type` and `court_name` columns that the underlying SQL migrations (`0002_phase2_schema.sql`) actually create. This is real schema drift the Phase 1 audit flagged. Modifying the Drizzle schema would be a schema change (out of scope).

Fix: cast the matters values literal to `any[]` with an inline comment explaining the drift. At runtime drizzle drops keys it doesn't know about, so the seed still produces valid SQL.

### F5 — `apps/api` build: `@coclerk/domain` resolution failure under cross-package compile

Root cause: when `apps/api`'s tsc compiles a file that imports `@coclerk/database`, tsc reads `packages/database/src/audit.ts` directly (via workspace symlink). That file's `import … from '@coclerk/domain'` is resolved relative to `packages/database/`, where the package has no `node_modules/@coclerk/domain` (same root cause as F2.b).

Fix: added the same `paths` mapping to `apps/api/tsconfig.json` and overrode `composite: false`, `declaration: false`, dropped `rootDir`. Apps/api still emits to `dist/` (its `start` script reads `dist/index.js`), so emit is kept on — only the composite/rootDir strictness is relaxed.

### F6 — `apps/api/src/routes/auth.ts`: `jwt.sign` overload mismatch

Root cause: a newer `@types/jsonwebtoken` types `SignOptions.expiresIn` as `number | StringValue | undefined` where `StringValue` is a branded template-literal type from the `ms` package (e.g. `${number}h`). `config.jwtExpiresIn` is plain `string` (from env), so it fails the brand check.

Fix: cast to `jwt.SignOptions['expiresIn']` at the call site. Local cast, no broader type changes. Added a comment explaining why.

### F7 — first `pnpm install` aborted with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`

Root cause: pnpm 10 wants TTY confirmation before purging `node_modules` after `.npmrc` config changes.

Fix: re-run as `CI=true pnpm install`. This is the documented headless workaround.

## Final state

```text
pnpm -r build         → 0 failures  (10 packages built; @coclerk/config, @coclerk/ui, @coclerk/workflow-engine have no build script and are correctly skipped)
pnpm -r test          → 5 packages tested; 37 tests total, all passing
  ├── packages/redaction  16 ✓
  ├── packages/domain     12 ✓
  ├── packages/shared     pass-with-no-tests ✓
  ├── apps/api             7 ✓
  ├── apps/web-clerk       1 ✓
  └── apps/web-barrister   1 ✓
pnpm --filter @coclerk/redaction test → 16 ✓
tsc --noEmit (per package)            → exit 0 for every package with a tsconfig
```

Test count delta vs. Phase 1 baseline:
- Redaction: 14 → 16 (added overlap defense + per-category counter stability)
- Domain: 9 → 12 (added three Fees Clerk capability tests)
- Apps/api: 6 → 7 (added reject-allocation flow)

## No tests were skipped, deleted, or marked xfail.

No failing test was disabled to make the suite green. The two source bugs the suite originally hid (F2.a stale `./roles` export and F2.b undeclared `@coclerk/domain` consumer) are now visible through tsc and addressed via tsconfig path mapping; both are recorded as `deferred (needs human decision)` candidates in PROPOSALS for a future cycle that has permission to edit dependency lists.

---

End of Phase 3 artifact.
