# CoClerk Phase 3 Workflow Slice

This section details the end-to-end slice implemented for the V1 Roadmap.

## Scope Implemented
- **Local-safe Intake Creation**: Simulating an inbound email processing through parsing hooks and emitting results to the database synchronously.
- **Workflow State Management**: Tracking the result of deterministic mock conflict-checks and LLM candidate ranking. 
- **Barrister Pending Actions**: Structured handling of accepted cases directly into a state that locks until clerk approval.
- **Approval Gating**: Diary and matter state changes are explicitly prevented until the `approveAllocation` function is invoked by an authorized Clerk role.
- **Full Audit Trace**: `MockAuditService` handles every interaction from arrival to assignment.

## How to Demo and Verify Locally
You can verify the entire workflow path using cURL or an HTTP client against the `apps/api` Express gateway:

1. **Simulate Email Arrival**: 
   `POST /api/v1/workflow/intake/simulate` 
   - Observe JSON returned containing draft Matter ID, Parsed results, and Mock Candidate Ranks.
2. **View Barrister Inbox**:
   `GET /api/v1/workflow/pending-actions`
   - Observe the queued notification to candidate `b1`.
3. **Barrister Accepts Allocation**:
   `POST /api/v1/workflow/barrister-response/:notificationId` 
   - Body: `{ "response": "accept" }`
   - Observe the action completes, but no mutations occur to core db. It registers an approval request.
4. **List Approvals**:
   `GET /api/v1/workflow/approvals`
   - Grab the specific approval ID.
5. **Clerk Approves Assignment**:
   `POST /api/v1/workflow/approve-allocation/:approvalId`
   - Observe successful execution.
6. **Inspect Final DB Shape**:
   `GET /api/v1/workflow/state/inspect`
   - Matter status changed to `instructed`.
   - `diary_entries` populated internally with correct timing.

## Deferred Items
- Polished Frontend UX.
- Real CMS and external messaging API integrations are still stubbed.
- Actual LLM connectivity (anthropic/GPT) has a deterministic mock injected to keep things local-safe without credentials.
