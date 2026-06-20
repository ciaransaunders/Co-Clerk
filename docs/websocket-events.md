# Technical Specification: WebSocket Event Contracts

## 1. Overview
The WebSocket infrastructure in CoClerk supports real-time, bidirectional communication to deliver instant notifications, UI state refreshes, and status updates across the web applications (Clerk Desk and Barrister Inbox).

The event shapes are defined in `packages/shared/src/events.ts`.

## 2. Subscription Scoping

Clients must explicitly subscribe to scopes upon establishing the WebSocket connection. The backend verifies permissions (ADR 0005, Permissions Matrix) before accepting subscriptions.

| Scope Pattern | Description | Privilege Required |
|---------------|-------------|--------------------|
| `user:{user_id}` | Personal events (e.g., own notifications, diary actions). | `user_id` matches authenticated token ID. |
| `role:{role_key}` | Role-wide broadcasts (e.g., general system alerts to all `junior_clerk`s). | Must hold the specified `role_key`. |
| `matter:{matter_id}` | Updates specific to a single matter (e.g., status changes, new messages). | Must be assigned to the matter or have `view_financials`/`view_all_diaries` equivalent capabilities. |
| `chambers:global` | Global alerts, high-level structural changes. | Practice Director or Senior Clerk only. |

Subscription requests follow a strict envelope format from client to server:
```json
{
  "action": "subscribe",
  "scopes": ["user:123", "matter:456"]
}
```

## 3. Payload Schemas
Events strictly conform to the `CoClerkEvent` discriminated union type in `packages/shared/src/events.ts`.

Example Payload:
```json
{
  "id": "evt_abc123",
  "correlation_id": "req_xyz789",
  "timestamp": "2026-04-10T12:00:00Z",
  "version": 1,
  "domain": "matter",
  "type": "matter:status_updated",
  "payload": {
    "matter_id": "mat_456",
    "old_status": "draft",
    "new_status": "triage"
  }
}
```

**Domains Present:**
- `intake`: Submissions and AI processing of incoming instructions.
- `matter`: Lifecycle state and allocations.
- `diary`: Scheduling clashes and block generation.
- `notification`: Read-receipts and delivery confirmations.
- `system`: Channel bridge events (e.g., WhatsApp integration failures).

## 4. Delivery Guarantee Specification

### At-Least-Once Delivery & Idempotency
- **Guarantee**: Due to the critical nature of legal notifications, the system provides **at-least-once** delivery via WebSocket. If an acknowledgment (ACK) is not received from the client within a timeout window, the server will requeue or redeliver.
- **Client Dedup**: The client must maintain a bounded LRU cache (e.g., last 1000 event IDs) to **deduplicate** incoming events based on their UUID (`id`).
- **Idempotency**: UI state reducers processing `payload` changes must be strictly idempotent to handle potential redelivery.

### Delivery Sequence
1. Server pushes event JSON via WebSocket.
2. Client successfully parses the payload and persists/renders state.
3. Client responds with `{ "action": "ack", "event_id": "evt_abc123" }`.
4. If the server does not receive the ACK within 5000ms, the event is marked for redelivery pending reconnection or polling fallback.

## 5. Fallback Polling Design

Mobile connections (e.g., Barristers on trains) and certain corporate firewalls can aggressively drop WebSocket connections. CoClerk implements a robust fallback mechanism.

### Short Polling Strategy
1. **Detection**: If the WebSocket drops, the client attempts immediate exponential backoff reconnections.
2. **Fallback Activation**: If the socket cannot reconnect after 3 attempts (or if the initial upgrade is blocked), the client gracefully degrades to REST-based **Short Polling**.
3. **Polling Interval**: Defaults to every 10 seconds.
4. **Endpoint**: `GET /api/v1/events/sync?since={last_timestamp}`
   - The response provides all missed events for the user's active scopes since the provided ISO-8601 timestamp.
5. **Recovery**: The client occasionally retries the WebSocket upgrade in the background. If successful, it performs one final REST sync to close any gaps before resuming standard socket listening.
