# ADR 0005: Resolution of Fees Clerk Role Gap

## Status
Accepted

## Context
The `FEATURE_SPEC.md` identifies a "Fees Clerk" persona with specific responsibilities for invoicing (C4.1) and debt management (C4.2). However, the initial 5-tier clerk hierarchy defined in `ARCHITECTURE.md` and implemented in `packages/domain/src/roles.ts` does not include a dedicated role for this function. 

Chambers vary in how they handle fees:
1. Small chambers: Junior Clerks or Practice Managers handle fees as part of their general duties.
2. Large chambers: Dedicated Fees Clerks or a separate Fees Department handle all billing.

The system needs to accommodate both models without complicating the core role hierarchy.

## Decision
We will use the **Capability System** (established in ADR 0004/A11) to resolve the Fees Clerk gap.

1. **No New Tier**: We will not add a "Fees Clerk" tier to the 1-5 clerk hierarchy.
2. **Explicit Capabilities**: We will introduce `view_financials` and `manage_billing` as explicit capabilities.
3. **Flexible Assignment**: 
   - A `junior_clerk` or `practice_manager` can be designated as a "Fees Clerk" by possessing these capabilities.
   - By default, `practice_director` and `senior_clerk` roles will possess these capabilities for chambers-wide oversight.

## Consequences
- **Simplified Hierarchy**: The 5-tier management hierarchy remains clean.
- **Role Flexibility**: Specialized duties (Fees, EDI monitoring, etc.) can be assigned to any clerk regardless of their management tier.
- **Granular Access**: We can gate financial dashboards strictly behind `view_financials` rather than a blanket tier check, supporting the "need to know" principle.
