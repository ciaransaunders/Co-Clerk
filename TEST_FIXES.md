# Test Suite Fixes

**Date:** 2026-04-10  
**Scope:** Resolving all test runner failures across the monorepo following the architecture review implementation phase.

---

## Summary

The test suite could not run at all before these fixes — no package had a working test configuration. After fixes: **31 tests across 9 test suites, all passing**.

| Package | Tests | Status |
|---|---|---|
| `packages/redaction` | 14 | ✓ |
| `packages/domain` | 9 | ✓ |
| `apps/api` | 6 | ✓ |
| `apps/web-clerk` | 1 | ✓ |
| `apps/web-barrister` | 1 | ✓ |
| `packages/shared` | 0 (no test files) | ✓ |

---

## Issues Found and Fixes Applied

### 1. Missing `pnpm-workspace.yaml`

**Issue:** pnpm v8+ requires a `pnpm-workspace.yaml` file to define workspace packages. The repo only had a `workspaces` field in the root `package.json`, which pnpm ignores with a warning. Workspace packages (`@coclerk/*`) could not resolve each other.

**Fix:** Created `pnpm-workspace.yaml` at the repo root:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

---

### 2. `packages/redaction` — TypeScript couldn't find Jest globals

**Issue:** `engine.test.ts` used `describe`, `it`, `expect` but TypeScript reported `TS2582: Cannot find name 'it'` and `TS2304: Cannot find name 'expect'`. The package had `@types/jest` installed but no local `tsconfig.json` — it inherited the root tsconfig, which had no `types: ["jest"]` entry.

**Fix:** Created `packages/redaction/tsconfig.json` extending the root config and adding `types: ["jest", "node"]`.

---

### 3. `packages/redaction` — Phone regex didn't match `+44` numbers

**Issue:** The UK phone regex used `\b` (word boundary) as its leading anchor:
```
/\b(?:\+44|0044|0)\s?(?:\d[\s.-]?){9,10}\b/g
```
`\b` requires a transition between a word character and a non-word character. Since `+` is a non-word character, and a space (also non-word) precedes it, no word boundary exists. Numbers like `+44 20 7946 0958` were silently skipped.

**Fix:** Replaced `\b` with a negative lookbehind `(?<!\w)`, which correctly asserts "not preceded by a word character":
```
/(?<!\w)(?:\+44|0044|0)\s?(?:\d[\s.-]?){9,10}\b/g
```

---

### 4. `packages/redaction` — NINO test used an invalid NI number

**Issue:** The NINO test used `QQ 12 34 56 C` as test input. The regex correctly implements the UK HMRC rule that excludes certain letters from NINO prefixes: `[A-CEGHJ-PR-TW-Z]`. The letter `Q` falls between `P` (end of range `J-P`) and `R` (start of range `R-T`) and is explicitly excluded. The regex was correct; the test data was wrong.

**Fix:** Changed test input from `QQ 12 34 56 C` to `AB 12 34 56 C`, a valid NINO prefix.

---

### 5. `packages/domain` — No test runner configured

**Issue:** Three test files existed (`roles.test.ts`, `riskTier.test.ts`, `audit.test.ts`) but `package.json` had no `test` script, no jest devDependencies, and no `jest.config.js`.

**Fix:** Added to `package.json`: `"test": "jest"` script, `jest`, `ts-jest`, `@types/jest` devDeps. Created `jest.config.js` (ts-jest preset, node environment) and `tsconfig.json` with `types: ["jest", "node"]`.

---

### 6. `packages/domain` — `riskTier.test.ts` duplicate import

**Issue:** The import line was:
```ts
import { determineRiskTier, determineRiskTier, ActionContext } from './riskTier';
```
`determineRiskTier` was imported twice, causing a TypeScript error.

**Fix:** Removed the duplicate identifier.

---

### 7. `packages/domain` — `hasPermission` logic bug

**Issue:** When `requireTier` middleware called `hasPermission(role, tier, 'manage_chambers')` with a `requiredCapability` the user didn't have, the function fell through to the tier check and granted access anyway. For example, a Junior Clerk (tier 5) passed a `requireTier(5, 'manage_chambers')` check despite not having the `manage_chambers` capability.

Root cause — the original implementation:
```ts
if (requiredCapability && userRole.capabilities.includes(requiredCapability)) {
  return true; // grant if capability matches
}
// falls through to tier check even when capability was required but missing
if (userRole.key === 'barrister') return false;
return userRole.tier <= requiredTier; // ← over-grants
```

**Fix:** When a capability is specified, it is the sole access criterion — tier is not checked:
```ts
if (requiredCapability) {
  return userRole.capabilities.includes(requiredCapability);
}
if (userRole.key === 'barrister') return false;
return userRole.tier <= requiredTier;
```

This also correctly allows barristers to pass capability-gated checks (e.g. `modify_own_diary`) without entering the clerk tier hierarchy.

---

### 8. `apps/api` — No test runner configured

**Issue:** Four test files existed but `package.json` had no `test` script, no jest devDependencies, and no `jest.config.js`. The package also had no local `tsconfig.json`.

**Fix:** Added `"test": "jest"` script, `jest`, `ts-jest`, `@types/jest`, `@types/node` devDeps. Created `jest.config.js` with `moduleNameMapper` entries so workspace packages resolve correctly under jest (jest doesn't use Vite's resolver). Created `tsconfig.json` with `types: ["jest", "node"]`.

---

### 9. `apps/api` — `intakeWorkflowService.ts` missing LPP fields

**Issue:** `InstructionIntake` and `Matter` domain types were updated with LPP classification fields (`is_lpp_sensitive`, `has_lpp_data`) as part of ADR 0007 implementation, but `intakeWorkflowService.ts` was not updated. TypeScript reported `TS2741: Property 'is_lpp_sensitive' is missing` and `TS2741: Property 'has_lpp_data' is missing`, causing the `workflow.test.ts` suite to fail to compile.

**Fix:** Added `is_lpp_sensitive: false` to the `InstructionIntake` object literal and `has_lpp_data: false` to the `Matter` object literal in `intakeWorkflowService.ts`. Both default to `false` (non-LPP) as the safe baseline for the mock intake flow.

---

### 10. `apps/api` — `index.test.ts` imported missing `supertest`

**Issue:** `index.test.ts` imported `supertest` which was not installed. The test body was already commented out with a note that supertest wasn't available, making the import dead code.

**Fix:** Removed the `supertest` and `requireAuth` imports from `index.test.ts`.

---

### 11. `packages/shared` — `test` script with no jest config

**Issue:** `package.json` had `"test": "jest"` but no `jest.config.js`, no `ts-jest`, no `@types/jest`, and no `tsconfig.json`. Running `pnpm -r test` would fail on this package.

**Fix:** Added `ts-jest` and `@types/jest` devDeps. Created `jest.config.js` with `passWithNoTests: true` (the package has no test files yet). Created `tsconfig.json` with `types: ["jest", "node"]`.

---

### 12. `apps/web-clerk` and `apps/web-barrister` — Jest used instead of Vitest

**Issue:** Both apps had `"test": "jest"` but jest was not installed. More importantly, these are Vite-based React apps — Vitest is the correct test runner as it reuses the Vite config and handles ES modules, JSX, and workspace aliases without additional transformation layers.

**Fix:** Replaced `jest` with `vitest` in both `package.json` scripts. Added devDeps: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`. Created `vitest.config.ts` (jsdom environment, `globals: true`, setup file). Created `src/test-setup.ts` that imports `@testing-library/jest-dom`.

---

### 13. `apps/web-clerk` and `apps/web-barrister` — `@coclerk/ui` undeclared dependency

**Issue:** Both `App.tsx` files import `{ AuthProvider, useAuth } from '@coclerk/ui'`, but `@coclerk/ui` was not listed in either app's `package.json` dependencies. The package existed in the workspace but wasn't declared, so Vitest (and the Vite build) couldn't resolve it.

**Fix:** Added `"@coclerk/ui": "workspace:*"` to the `dependencies` of both web apps.

---

### 14. `apps/web-clerk` and `apps/web-barrister` — Stale test assertions

**Issue:** `web-clerk/src/App.test.tsx` asserted the presence of "Intake Dashboard" and "Action Queue". `web-barrister/src/App.test.tsx` asserted the presence of "Inbox". None of these strings exist in the unauthenticated render of either app — they are inside authenticated routes that redirect to `/login` when no user is present.

**Fix:** Rewrote both tests to assert the Login page renders correctly for unauthenticated users — checking for the app title ("CoClerk"), the login subtitle ("Clerk Desktop Login" / "Barrister Mobile Login"), and the "Sign In" button. This is the correct entry state for both apps.
