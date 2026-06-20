# ADR 0003: Phase 3 Workflow Slice Orchestration

## Status
Accepted

## Context
Phase 3 requires us to implement the first operational loop: intake parsing -> conflict checking -> allocation -> barrister notification -> approval -> final mutation. Our primary restriction is remaining verifiable and deterministic whilst adhering perfectly to the BSB audit policies and high-risk action confirmation hooks implemented in phases 1 & 2.

## Decision
- We created a centralized `IntakeWorkflowService` operating identically to a Workflow/Process Manager pattern. This aggregates the interactions across `intakes`, `conflict_checks`, `allocation_suggestions`, and `notification_queues`.
- External integrations (LLM parser for inputs, CMS sync) have been substituted with mock deterministic paths that label their output provenance clearly (`model_provider: 'mock-deterministic'`), as requested to maintain local observability and testing.
- The high-risk transition - mutating the master `matters` and `diary_entries` tables based on a barrister's acceptance of an allocation - cleanly creates a pending request inside the orchestration boundary. The final step `approveAllocation()` executes the modifications to externalized tables, creating distinct `auditService.log()` entries proving the multi-party (barrister -> clerk) workflow requirement is met.

## Consequences
- The core routing sequence `/workflow/intake/simulate -> /workflow/barrister-response -> /workflow/approve-allocation` can be reliably executed manually or by a UI to demo the complete slice securely.
- If and when an asynchronous queue is fully deployed, `IntakeWorkflowService` methods can be straightforwardly enqueued as background `jobHandlers` directly, without rewriting the control flow or audit logs.
