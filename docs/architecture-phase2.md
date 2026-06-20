# CoClerk Phase 2 Core Domain

## Scope Implemented
This phase builds directly upon the Phase 1 primitives. It successfully introduces the schema, domain data models, and API surface for the following areas:

- **Matters & Lifecycle:** Tracking case statuses and transitioning them with correct risk-tier verification.
- **Diary & Availability:** Handling system-wide booking events and opaque block visibilities. Modifying the diary triggers a "high-risk" pending state as intended.
- **Notifications & Communications:** Base models mapping out communication interactions, queuing user-specific notifications safely.
- **Allocations:** Capturing decision reasoning logs safely into the database for BSB fair access monitoring.

## Integration with Phase 1
- **Auth & Risk**: Our operations explicitly require specific authentication roles (e.g. `tier 3`) and correctly divert to the audit `MockAuditService` logging mechanism using the exact tier values calculated by the Phase 1 risk engine.
- **Database**: Additive changes applied sequentially in `0002_phase2_schema.sql`.

## Deferred
- Conflict-checking logic has been deferred entirely to Phase 3.
- Intake NLP parsing logic has been deferred.
- No real integrations for email fetching or CMS sync have been orchestrated.
