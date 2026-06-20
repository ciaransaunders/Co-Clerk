# CoClerk — Architecture Review

> **Reviewer:** Claude (pre-implementation peer review)
> **Date:** 2026-04-10
> **Documents reviewed:** ARCHITECTURE.md (v0.1.0-draft), FEATURE_SPEC.md (v0.1.0-draft), README.md, coclerk.md, docs/architecture-phase{1,2,3}.md, docs/adr/0001–0004, all source files in apps/ and packages/
> **Scope:** Read-only technical architecture review calibrated for pre-implementation decision-making

---

## 1. Executive Summary

CoClerk's architecture is unusually coherent for a v0.1.0-draft. The dual-persona model (clerk and barrister), the two-tier risk classification, the audit-first design, and the separation between workflow engine and CMS adapter layer are all well-reasoned and clearly traced back to regulatory requirements and user research. The feature specification is detailed and disciplined — 63 user stories with risk tiers consistently applied. The main risks to implementation readiness are: (a) the CMS adapter layer depends entirely on vendor API access that has not been confirmed, (b) the redaction engine is specified at the policy level but not at the implementation level, (c) several documents referenced in ARCHITECTURE.md Section 9 do not yet exist, and (d) the gap between the monorepo structure actually built (apps/api, apps/worker, apps/web-clerk, apps/web-barrister, packages/*) and the proposed structure in Section 9 of ARCHITECTURE.md has not been reconciled. The architecture is ready for a first implementation milestone once the CMS spike is resolved and the redaction engine is specified to buildable depth.

---

## 2. Strengths

**Risk-tier model is clean and consistently applied.** The binary low/high classification in `riskTier.ts` maps directly to the FEATURE_SPEC user stories — every story is tagged, and the enforcement pattern (202 Accepted with `approval_request_id` for high-risk actions) is implemented end-to-end in the Phase 3 workflow slice. The configurable override for `double_approval_comms` via `chambers_config` demonstrates that the model can flex per-chambers without losing its safety guarantees.

**Audit trail is structural, not bolted on.** The `MockAuditService` is injected at every mutation point in `IntakeWorkflowService`, and the `audit_log` table captures before/after state as JSONB. This is the right pattern for BSB rC110 compliance — the audit trail is a first-class concern, not a logging afterthought. The allocation reasoning logs (C1.4) being editable-with-full-history is a thoughtful design choice that reflects how clerks actually work.

**The Phase 3 end-to-end slice is an excellent architectural proof.** The seven-step flow (intake → parse → conflict check → shortlist → notify → barrister response → clerk approval → mutation) exercises the risk engine, the audit service, the approval gate, and the multi-party workflow pattern. Using `mock-deterministic` providers with clear provenance labelling (`model_provider: 'mock-deterministic'`) means this slice can be demo'd without any external dependencies. ADR 0003 correctly identifies that the `IntakeWorkflowService` methods can be enqueued as background jobs without rewriting control flow — the separation is genuinely clean.

**B2.1 (Opaque Unavailability) is the standout design decision.** Section 11 of ARCHITECTURE.md demonstrates the kind of design thinking that distinguishes this project: the problem is traced from research findings, the trade-off is named explicitly, and the resolution is configurable with a safe default. The `visibility` field on `diary_entries` and the `senior_clerk_reason_visibility` flag in `chambers_config` implement this cleanly.

**CMS adapter interface is well-abstracted.** The `CMSAdapter` interface (Section 2.2) covers the right surface area — diary, matters, fees, contacts, sync — and the architecture document is honest that the implementation methods are unknown. Designing the interface first and flagging the research spike is the correct sequencing.

**Dual frontend strategy is appropriate.** Separating `web-clerk` (desktop-first, feature-rich) from `web-barrister` (mobile-first, 30-second interaction cards) reflects genuine user research about how these two groups work. ADR 0004's decision to use lightweight CSS tokens rather than a component library keeps the dependency surface small for a self-hosted deployment.

---

## 3. Gaps and Ambiguities

### 3.1 Redaction Engine — Policy Without Implementation Spec

**What's missing:** ARCHITECTURE.md Section 2.2 defines four redaction levels (Maximum, Moderate, Minimum, None) as a table of what categories of data are redacted. There is no specification for how the redaction engine identifies entities to redact. The `src/redaction/` directory is referenced in Section 9 but does not exist in the codebase.

**Why it matters:** Redaction is the mechanism that makes the "data sovereignty" claim in Core Design Principle 2 operationally true. A policy table is not buildable. An implementer needs to know: what NER model or rule set identifies personal names, addresses, and case numbers? Is redaction reversible (i.e. does the LLM response get de-redacted before presenting to the user)? What happens when redaction removes context the LLM needs to produce a useful response? How are redaction failures (missed PII) detected?

**Suggested resolution:** Add a "Redaction Engine — Technical Specification" section or document covering: entity recognition approach (regex rules, NER model, or hybrid), reversibility mechanism (token replacement with lookup table vs. irreversible masking), quality assurance approach (spot-check sampling, automated PII detection on LLM responses), and failure mode handling.

### 3.2 Role-Permission Model — Incomplete for Phases 4–6

**What's missing:** The five-tier hierarchy is defined in `roles.ts` and `FEATURE_SPEC.md`, and the `requireTier(n)` middleware enforces it at the API level. However, the permission model is currently a simple numeric comparison: `userRole.tier <= requiredTier`. Barristers are handled by a special case (`if (userRole.key === 'barrister') return false`). This works for Phase 1–3 where the question is "can this clerk do this clerk action?" but breaks down for Phases 4–6 where permissions are more granular.

**Specific examples:** C4.1 (draft fee note) should be accessible to a Fees Clerk — but there is no Fees Clerk role in the hierarchy. B4.5 (fee benchmarks) is controlled by a chambers config flag, not by role tier. C6.4 (EDI reporting) should be restricted to Senior Clerk and Practice Director, but the current `requireTier` would also admit Practice Managers. B6.5 (wellbeing flag) routes to a "designated wellbeing contact" — this is not modelled anywhere.

**Why it matters:** If the permission model isn't extended before Phase 4, feature-level access control will either be hacked into route handlers or will silently over-grant permissions.

**Suggested resolution:** Design an explicit permission matrix (role × feature × action) for all 63 user stories. Consider whether the current tier-only model needs supplementing with feature-scoped permissions or capability flags. The Fees Clerk role gap needs a decision: new role, or a capability flag on Practice Manager?

### 3.3 Channel Bridge — Architectural Skeleton Only

**What's missing:** The Channel Bridge is described at the conceptual level (Section 2.2) — it's a relay, not an autonomous agent; it delivers notifications and captures structured responses; no case data in message content. But there is no technical specification for how notifications are formatted for WhatsApp/Signal/SMS, how structured responses (accept/decline/concern) are captured from each channel, or how the bridge authenticates the barrister responding via a messaging platform.

**Why it matters:** The Channel Bridge is a security-critical component — it bridges the chambers network to external messaging platforms. Authentication is especially important: if a barrister responds "accept" to an instruction offer via WhatsApp, how does the system verify that the WhatsApp account belongs to that barrister and not someone else with their phone? The current architecture has no specification for this.

**Suggested resolution:** Specify the Channel Bridge as its own architecture section or document: message formatting per channel, response parsing, authentication binding (how a WhatsApp number is linked to a user account), and the security boundary between the bridge and the API gateway. This is likely a Phase 5 concern, but the security model should be designed now.

### 3.4 WebSocket Event Model — Events Listed, Contract Undefined

**What's missing:** Section 4.2 lists ten WebSocket events but does not specify their payloads, delivery guarantees, or subscription model. Who receives `diary.entry.updated` — all clerks, or only the clerk managing that barrister? What is the reconnection behaviour? Is there a fallback for clients that can't maintain a WebSocket connection (relevant for barristers on mobile with intermittent connectivity)?

**Why it matters:** WebSocket event design determines the real-time UX for both clerk and barrister dashboards. Getting the subscription model wrong will either over-broadcast sensitive data or under-deliver notifications.

**Suggested resolution:** Define event payloads, subscription scoping (per-user, per-role, per-matter), delivery guarantees (at-least-once with client-side dedup, or best-effort), and a fallback polling mechanism for unreliable connections.

### 3.5 Database Migration Strategy — Manual SQL Without Tooling

**What's missing:** Database migrations are currently manual SQL files (`schema.sql`, `0002_phase2_schema.sql`). ADR 0001 notes that an ORM layer "can remain manually versioned SQL files initially until an ORM layer (like Prisma or TypeORM) is strictly needed." There is no migration runner, no rollback mechanism, and no versioning beyond filename convention.

**Why it matters:** Self-hosted deployments will need a reliable upgrade path. If Chambers A is on Phase 2 and an update includes Phase 3 schema changes, the migration must be applied safely. Manual SQL files are fine for development but not for production deployment.

**Suggested resolution:** Adopt a migration tool (node-pg-migrate, Prisma Migrate, or equivalent) before the first external deployment. The decision can be deferred past the first milestone but should be spiked alongside Phase 1 deployment planning.

### 3.6 Missing Documentation Files

**What's absent:** ARCHITECTURE.md Section 9 lists four files under `docs/`: `design-decisions.md`, `research-synthesis.md`, `b2-1-opaque-unavailability.md`, and `security-model.md`. None of these exist. The `docs/` directory contains only `architecture-phase{1,2,3}.md` and `adr/0001-0004`.

**Why it matters:** The architecture document references these as if they exist. An implementer following the repo structure will expect them. The B2.1 rationale is partially covered in ARCHITECTURE.md Section 11, but the standalone document is missing. The security model is covered in Section 6 of ARCHITECTURE.md, but there is no dedicated document.

**Suggested resolution:** Either create these documents or update Section 9 to reflect reality. Consider whether Section 6 (Security) and Section 11 (B2.1) should be extracted into standalone docs or whether the Section 9 references should be removed.

### 3.7 Conflict Check — Logic Not Specified

**What's missing:** The conflict check in the Phase 3 slice is a mock that always returns `clear`. The FEATURE_SPEC (C1.2) requires checking "against all current matters in chambers." The architecture document does not specify what constitutes a conflict — matching party names? Matching solicitor firms? Matching subject matter? The conflict check rules for barristers' chambers are nuanced (a barrister can act against a former client's solicitor in some circumstances but not others).

**Why it matters:** A conflict check that produces false negatives is a regulatory risk; one that produces false positives will be ignored by clerks. The rules need legal input and will likely vary by chambers.

**Suggested resolution:** Add a "Conflict Check Rules" specification, even if it starts as a configurable rule set. Consider whether this needs its own research spike — the rules may not be standardisable.

---

## 4. Risk Register

| # | Risk | Category | Likelihood | Impact | Mitigation |
|---|------|----------|:---:|:---:|------------|
| R1 | CMS vendors (LEX, MLC, BarBooks) have no public API and refuse database-level access, making the adapter layer unbuildable beyond CSV import/export. | Technical | H | H | Spike 1 is correctly prioritised. If vendor APIs are unavailable, redesign around Outlook calendar sync + CSV as the primary integration path. Reframe CoClerk as standalone-first rather than CMS-augmentation. |
| R2 | Redaction engine fails to catch PII in LLM prompts, exposing privileged client data to cloud providers. | Security | M | H | Specify redaction engine to buildable depth (see §3.1). Implement automated PII scanning on outbound prompts as a second-pass safety net. Default to Maximum redaction. Log all outbound prompts for audit review. |
| R3 | Barrister authentication via Channel Bridge (WhatsApp/Signal) is spoofable — a stolen phone could approve instructions or modify diaries. | Security | M | H | Design Channel Bridge authentication binding (§3.3). Consider: quick actions via messaging require re-authentication through the secure UI for high-risk actions. Messaging channel used only for notification delivery, not for executing high-risk actions. |
| R4 | The permission model does not extend cleanly to Phases 4–6 features, requiring ad-hoc access control in route handlers. | Technical | H | M | Design the full permission matrix now (§3.2). Decide on Fees Clerk role, wellbeing contact designation, and feature-scoped capabilities before Phase 4 implementation begins. |
| R5 | WhatsApp Business API approval is denied because Meta classifies barrister instruction notifications as "marketing" or the use case doesn't fit approved message template categories. | Regulatory | M | M | Spike 4 is correctly identified. Have a fallback plan: SMS + email as the notification channel, with WhatsApp as a later addition if approved. Do not build the Channel Bridge with WhatsApp as the assumed primary channel. |
| R6 | i.AI Lex service is unreliable or discontinued, breaking citation verification (B3.6) and the data flow in Section 3.3. | Technical | M | M | ARCHITECTURE.md already flags this ("design for graceful degradation"). Ensure the citation verification workflow has an explicit fallback: present the AI summary with a warning badge ("citation verification unavailable") rather than blocking the workflow entirely. |
| R7 | BSB or SRA regulatory guidance changes to require specific AI transparency mechanisms beyond what B3.3 and the current audit model provide. | Regulatory | L | H | Spike 5 (BSB regulatory review) should be expanded to include a watching brief on SRA and BSB AI guidance. The audit-first design gives a strong foundation, but specific labelling or disclosure requirements may emerge. |
| R8 | Conflict check rules cannot be standardised across chambers, and implementing a configurable rule engine is a multi-month effort that blocks Phase 1 delivery. | Product | M | H | Separate the conflict check into two tiers: a simple "same party name / same solicitor" check that ships with Phase 1, and a configurable rule engine as a Phase 2+ enhancement. Accept that the simple check will have false positives and design the UX to make clerk override easy and audited. |
| R9 | Self-hosted deployment complexity (PostgreSQL, Node.js, Docker, TLS, identity provider integration) exceeds the technical capacity of most chambers IT teams. | Product | H | M | Consider a reference deployment (Docker Compose all-in-one) and a managed hosting option early. If self-hosting is the only path, provide an installation script and a health-check dashboard. |
| R10 | Monorepo structure divergence — the actual codebase structure (apps/packages) differs from the proposed structure in ARCHITECTURE.md §9 (src/web/mobile/bridge). An implementer will not know which to follow. | Technical | H | L | Reconcile §9 with reality. The actual structure is the correct one; update §9 to match. |
| R11 | Mock services (MockAuditService, mock-deterministic LLM, in-memory repositories) are used in production because the transition path to real implementations is not specified. | Technical | M | H | Define explicit interface contracts and a "real implementation checklist" for each mock: what must be true before the mock is replaced. Ensure the DI pattern used in IntakeWorkflowService is consistent across all services. |
| R12 | The `hasPermission` function unconditionally returns `false` for barristers, meaning any future feature requiring a barrister to perform a gated action will bypass the standard permission model. | Technical | H | M | Redesign `hasPermission` to support barrister-scoped permissions (e.g., "can modify own diary", "can approve own fee note") rather than blanket denial. |

---

## 5. Security and Data Privacy Assessment

### What's well-designed

The architecture takes a defence-in-depth approach to data sovereignty. Core Design Principle 2 (all case data on chambers infrastructure) is reinforced by the redaction engine, the self-hosted deployment model, and the explicit OpenClaw vulnerability mitigations in Section 6.1. The decision to pass document content as data rather than as LLM instructions is the correct prompt injection defence. Encrypted at-rest and in-transit with configurable redaction levels gives chambers a graduated control model.

The audit trail design is strong: every mutation logged with actor, entity, risk tier, outcome, and before/after state. The `approval_requests` table with snapshot JSONB preserves the state at the time of the request, which is essential for dispute resolution.

### Material gaps

**Redaction engine is the critical security gap.** The four-level policy is defined, but the mechanism to detect and redact PII is not. Without this, the "data sovereignty" claim is aspirational. The Maximum redaction level requires redacting "all names, addresses, dates of birth, case numbers, court file references" — this is a non-trivial NER task, and getting it wrong means privileged data reaches cloud LLM providers.

**Legal professional privilege is not modelled as a data classification.** The architecture treats all case data uniformly. In practice, some documents are subject to legal professional privilege (LPP) and some are not. An LPP-protected document that is sent to a cloud LLM provider — even with redaction — may constitute a waiver of privilege depending on the circumstances. The architecture should at least flag this risk and consider whether LPP-classified documents should only be processed by local models.

**Channel Bridge is a security boundary that needs its own threat model.** WhatsApp and Signal relay notifications outside the chambers network. Even though notifications "contain references, not substance" (Section 2.2), the metadata itself may be sensitive — the fact that Barrister X is being offered Instruction Y is potentially privilege-adjacent information. The Bridge also introduces a new authentication surface (phone number → user identity) that is not specified.

**Session management is mentioned but not specified.** Section 6.3 says "session management with configurable timeout" but the current implementation uses simple Bearer token strings (`dev-clerk`, `dev-barrister`) with no expiry, refresh, or revocation mechanism. The mock is appropriate for development, but the production session management design should be specified now to avoid painting the auth layer into a corner.

**Encryption at rest — "PostgreSQL with TDE or application-level encryption" — is an either/or that needs a decision.** TDE (Transparent Data Encryption) and application-level encryption have very different operational profiles. TDE protects against disk theft but not against a compromised database connection. Application-level encryption protects field-level data but complicates querying. For a system handling legally privileged data, this decision should be explicit.

**No specification for key management.** Encrypted data requires key management: where are encryption keys stored? How are they rotated? Who has access? A self-hosted system puts key management in the hands of chambers IT teams, which means the key management design must be simple and well-documented.

---

## 6. Implementation Sequencing Recommendation

### Phase 0: Pre-implementation (Weeks 1–3)

**Objective:** Resolve blockers and finalise the architecture for Phase 1.

1. **Execute Spike 1 (CMS API availability).** This is the single highest-priority action. The outcome determines whether CoClerk is a CMS augmentation layer or a standalone system. Contact LEX/MLC/BarBooks vendors. Test Outlook sync as a proxy. Assess CSV fallback. Document findings as ADR 0005.
2. **Execute Spike 4 (WhatsApp Business API).** Quick to assess — review Meta's documentation and template categories. If blocked, descope Channel Bridge to email + in-app notification for v1.
3. **Reconcile repo structure.** Update ARCHITECTURE.md §9 to match the actual monorepo layout. Create or remove the missing docs/ files.
4. **Specify the redaction engine.** Produce a technical specification covering entity recognition, reversibility, quality assurance, and failure modes. This is a blocker for any feature that sends data to a cloud LLM.
5. **Design the full permission matrix.** Map all 63 user stories to role × action permissions. Identify the Fees Clerk gap, the wellbeing contact routing, and the barrister-scoped permission needs.

### Phase 1: Foundation + Intake Slice (Weeks 4–8)

**Objective:** Deployable intake workflow with real database, real auth (even if SSO is deferred), and the first CMS adapter (or standalone fallback).

Build: Auth (local credentials first, SSO later), intake workflow (the Phase 3 slice is already proven — replace mocks with real DB), conflict check (simple name-matching tier), allocation reasoning log, audit trail persisted to PostgreSQL. Deploy with Docker Compose as a single-command local setup.

**Spike dependencies:** Spike 1 outcome determines whether CMS adapter work begins here or is deferred. Spike 3 (i.AI Lex) can run in parallel — it only blocks citation verification, not the core intake flow.

### Phase 2: Diary & Scheduling (Weeks 9–14)

**Objective:** Diary management with CMS sync (if available) or standalone diary.

Build: Diary CRUD with risk-tier enforcement, opaque unavailability (B2.1), clash detection, prep time estimation. If CMS sync is available, build the first adapter. If not, build standalone diary with Outlook sync as the integration point.

**Spike dependency:** Spike 2 (court listing data) is relevant here for C2.5 but is not a hard blocker — the feature can launch without court listing integration and add it later.

### Phase 3: Redaction Engine + LLM Integration (Weeks 12–16, overlapping)

**Objective:** Replace mock-deterministic LLM with real provider, fronted by the redaction engine.

Build: Redaction engine, LLM provider abstraction with at least one cloud provider (Anthropic Claude recommended as the first, given the project's use of Anthropic tooling), and Ollama for local model support. This phase enables the AI features across all workflow modules.

### Phase 4: Case Lifecycle + Fees (Weeks 15–22)

**Objective:** Phases 3 and 4 of the FEATURE_SPEC.

Build: Matter lifecycle state machine, fee note drafting, aged debt dashboard, financial reporting. Requires the resolved permission model (Fees Clerk role decision).

### Phase 5: Communication + Channel Bridge (Weeks 20–26, overlapping)

**Objective:** Phase 5 of FEATURE_SPEC plus Channel Bridge.

Build: Communication trail aggregation, draft generation, notification routing, Channel Bridge (email first, then WhatsApp/Signal if Spike 4 is resolved).

### Phase 6: Practice Review + Polish (Weeks 24–30)

**Objective:** Phase 6 of FEATURE_SPEC plus deployment hardening.

Build: Practice review packs, EDI reporting, wellbeing features, deployment documentation, migration tooling.

---

## 7. Open Questions for the Design Session

1. **Should the conflict check operate on CoClerk's local database, query the CMS in real time, or both?** If the CMS adapter supports `readMatters()`, real-time CMS queries give a complete picture. But if the adapter is CSV-based, the check can only run against locally ingested data, which may be stale.

2. **Is redaction reversible?** When the LLM returns a response referencing "[PERSON_1]", does the system de-redact to show the real name to the user? If yes, the redaction engine needs a token→value lookup table with its own access control and retention policy. If no, LLM responses will contain placeholder tokens that the user must mentally map.

3. **Should LPP-classified documents be excluded from cloud LLM processing entirely?** The architecture could enforce: LPP documents are only processed by local models (Ollama). This is a policy decision with significant UX implications — local models are less capable than cloud models.

4. **What is the Fees Clerk role?** The FEATURE_SPEC assigns fee stories to "Fees Clerk" but the role hierarchy has no such role. Options: (a) add a sixth clerk tier, (b) make it a capability flag on Practice Manager, (c) treat fee access as a permission scope rather than a role.

5. **How does the Channel Bridge authenticate high-risk responses?** If a barrister taps "accept" on a WhatsApp notification, what prevents a different person with access to their phone from accepting an instruction? Should high-risk quick actions via messaging redirect to the secure web UI for confirmation?

6. **Should the Court Knowledge Base be a separate open-source repository?** ARCHITECTURE.md §5.4 describes a PR-based contribution model. If the KB is embedded in the CoClerk repo, contributors need to interact with the full monorepo. A separate repo (e.g., `coclerk/court-knowledge`) with its own contribution guide would lower the barrier to contribution.

7. **What is the data retention boundary for audit logs?** GDPR requires data minimisation, but BSB rC110 compliance may require retaining allocation reasoning logs indefinitely. The architecture says "configurable per chambers" but doesn't address the tension between these two requirements. What is the recommended default?

8. **Should the `mock-deterministic` provider be retained as a permanent test/demo mode?** The mock provider is valuable for demos, onboarding, and CI testing. Rather than replacing it, should it be formalised as a supported provider alongside the real LLM providers?

9. **How should the system handle the cab-rank rule?** The glossary defines it, and it's relevant to allocation (C1.3), but the FEATURE_SPEC doesn't specify how CoClerk should surface cab-rank obligations when generating shortlists. Should the system flag when declining a particular instruction might breach the cab-rank rule?

10. **What is the deployment target for v1?** The architecture says "self-hosted" but the actual deployment profile matters: Docker Compose on a chambers server? A VM in a managed hosting environment? Kubernetes? The answer affects the migration tooling, monitoring, and operational documentation needed.

11. **Should the WebSocket connection carry different events based on role?** A clerk WebSocket subscription should receive `diary.clash.detected` across all barristers; a barrister subscription should only receive events for their own diary. Is this filtering done server-side (separate event streams per role) or client-side (broadcast all, filter in the UI)?

12. **How are "configurable per chambers" settings actually configured?** The architecture references chambers-level configuration extensively, but the only configuration surface is `PATCH /config/chambers` restricted to Practice Director. Is there a setup wizard for initial configuration? What are the defaults for a new installation?

---

## 8. Minor Issues

**Terminology drift between ARCHITECTURE.md and the codebase.** ARCHITECTURE.md §9 proposes a `src/` directory with `workflow/`, `cms-adapters/`, `llm/`, `redaction/`, and `mcp/` directories. The actual codebase uses `apps/` and `packages/`. The `coclerk.md` file shows a third structure variant with `apps/mcp-host/` and `packages/audit-contracts/`. Three competing structural visions should be resolved to one.

**`hasPermission` always returns `false` for barristers.** This is noted in the risk register (R12) but worth flagging here too: the comment "Barristers have different permission context" acknowledges the gap without resolving it.

**Phase 1 docs say Node v18+; README and `.nvmrc` say v20.11.1.** `docs/architecture-phase1.md` line 23 says "Node.js (v18+)" while the rest of the project targets v20. This should be corrected.

**`package.json` specifies pnpm ≥ 8 but some docs reference `npm install` and `npm run start`.** README.md uses both `pnpm install` and `npm install` / `npm run start` in different sections. Pick one and be consistent.

**`docker-compose.yml` database credentials are hardcoded.** `coclerk` / `coclerk_password` in the compose file. Fine for local dev, but the `.env.example` should make clear these must be changed for any non-local deployment, and the compose file should reference env vars.

**`MockAuditService` uses `Math.random()` for ID generation.** This produces non-UUID strings that won't match the `UUID` column type in `audit_log`. When transitioning to real PostgreSQL persistence, the ID generation must switch to `gen_random_uuid()` or equivalent.

**The `AllocationSuggestion` mock hardcodes barrister IDs as `b1` and `b2`.** These don't correspond to any seeded user data. When wiring to the real database, the allocation shortlist will need to query actual `barrister_profiles`.

**No dedicated `tests/` directory exists, though unit tests are co-located with source files.** The `tests/` directory referenced in ARCHITECTURE.md §9 does not exist, but `.test.ts` files are present alongside source files (e.g., `roles.test.ts`, `riskTier.test.ts`, `audit.test.ts`, `workflow.test.ts`). This is a reasonable pattern, but §9 should be updated to reflect it. Integration or end-to-end tests covering the full Phase 3 workflow slice across service boundaries should be a near-term priority.

**The `lex-uk-law-skill.md` file in the repo root is a Claude skill configuration file, not project documentation.** It should either be moved to a `.claude/` or `tools/` directory, or removed from the repo if it's only relevant to the development environment.

**ADR 0004 mentions `create react scripts` ("create react scripts environments generally demand independent process booting").** CRA has been deprecated since 2023. If the React apps are using CRA, this should be flagged for migration to Vite or similar. If they're not using CRA, the ADR text should be corrected.

**The glossary (Section 12) is missing entries that appear in the feature spec.** Missing: "Fees Clerk", "EDI" (referenced in C6.4), "PWA", "MFA", "TDE", "NER". Consider whether the glossary targets a technical audience (who knows PWA/MFA) or a chambers audience (who may not).

---

*End of review. All observations are based solely on the documents and source files present in the repository as of 2026-04-10. No source files were modified.*
