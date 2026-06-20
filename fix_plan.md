# CoClerk Fix Plan

## CATEGORY A — MINOR ISSUES
- [x] A1: Reconcile ARCHITECTURE.md §9 directory structure with actual monorepo layout
- [x] A2: Fix Node version drift (target v20)
- [x] A3: Normalise package manager to pnpm
- [x] A4: Secure docker-compose.yml hardcoded credentials
- [x] A5: Fix MockAuditService ID generation to use randomUUID
- [x] A6: Fix AllocationSuggestion mock barrister IDs
- [x] A7: Move lex-uk-law-skill.md out of repo root
- [x] A8: Fix ADR 0004 reference to "create react scripts"
- [x] A9: Update ARCHITECTURE.md §9 to reflect co-located test pattern
- [x] A10: Extend the glossary
- [x] A11: Fix hasPermission unconditionally returning false for barristers
- [x] A12: Reconcile or remove the four missing docs referenced in ARCHITECTURE.md §9

## CATEGORY B — ARCHITECTURAL GAPS
- [x] B1: Redaction engine specification
- [x] B2: Permission matrix and Fees Clerk gap (ADR 0005)
- [x] B3: WebSocket event contracts
- [x] B4: Conflict check specification
- [x] B5: Channel Bridge threat model
- [x] B6: Database migration tooling (ADR 0006)
- [x] B7: LPP classification (ADR 0007)
- [x] B8: Encryption at rest decision (ADR 0008)
- [x] B9: Migrate React apps (clerk/barrister) from CRA to Vite

## CATEGORY C — RESEARCH SPIKES
- [x] C1: CMS API availability spike (ADR 0009)
- [x] C2: WhatsApp Business API spike (ADR 0010)

## QUALITY GATES (discovered during audit)
- [x] Q1: Replace placeholder redaction engine with working Stage 1 regex implementation + tests
- [x] Q2: Add WebSocket event specification document (subscription scoping, delivery guarantees, fallback polling)
- [x] Q3: Add B4 conflict check tier-1 implementation against local database data (currently only spec, no code)
