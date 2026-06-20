# ADR 0002: Phase 2 Core Domain Implementation

## Status
Accepted

## Context
Following the implementation of Phase 1 foundations, Phase 2 requires establishing the core domain records: matters, lifecycle events, diaries, notifications, contacts, and allocation records. These elements need to integrate seamlessly with our existing TypeScript monorepo and PostgreSQL schemas, whilst strictly adhering to the BSB audit and risk-tier enforcement protocols outlined in the ARCHITECTURE.md.

## Decision
- Extended the `packages/database/src/0002_phase2_schema.sql` to represent the core entities as standard normalized SQL tables. We heavily utilized `JSONB` specifically for metadata (e.g. `inputs_snapshot`, `ranked_candidates`, `original_reasoning`) to preserve flexibility for upcoming AI features, but kept workflow state transitions strongly normalized.
- Extended the `packages/domain` area with precise TypeScript interfaces that match these SQL representations, ensuring types cascade safely down to the frontend code when built.
- Exposed explicit controller modules under `apps/api/src/routes` ensuring that Phase 1's `requireTier` and `determineRiskTier` functions dictate the execution of domain operations.
- Modified data flows to purposefully pause operations like "diary modification" returning a `202 Accepted { status: pending_confirmation }` response, rather than bypassing risk logic.

## Consequences
- The domain types are cleanly exposed to Phase 3 slice implementation without tight coupling to the LLM backend or specific prompt abstractions.
- The use of Express routers ensures that high-risk requests are flagged seamlessly upstream to frontend clients.
