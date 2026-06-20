# ADR 0010: WhatsApp Business API — Integration Strategy & v1 Scope

## Status
Accepted

## Context

CoClerk's Channel Bridge (ARCHITECTURE.md §6.1) provides barristers with
mobile-first, 30-second interactions for triaging instructions and updating
diaries.  WhatsApp is a primary candidate channel because it is already widely
used informally between barristers and clerks.

A feasibility spike was conducted (see `docs/spikes/whatsapp-api.md`) to
evaluate the Meta WhatsApp Cloud API.  The spike confirmed:

1. **Technical feasibility** — The Cloud API supports interactive button
   messages, pre-approved templates, and webhook-based inbound handling.
2. **Regulatory compatibility** — Legal professional services are not in any
   Meta-restricted category.  UK barristers' chambers qualify for Business
   Verification.
3. **Cost viability** — Estimated £6–7/month for a 30-barrister chambers.
4. **Setup overhead** — Each chambers deployment requires a Meta Business
   Account, Business Verification (2–10 days), and a dedicated phone number.

The primary risk is not technical but operational: some chambers may be
unwilling or unable to create a Meta Business Account, or may prefer not to
route any legal-adjacent data through Meta infrastructure.

## Decision

### 1. WhatsApp Channel — Opt-in v1 Feature

WhatsApp support will ship in v1 as an **opt-in, per-chambers feature** — not
a hard dependency.  Chambers that do not configure WhatsApp still have full
functionality via email and in-app notifications.

### 2. Meta Cloud API (Not On-Premises)

We will use the **Meta Cloud API**, not the legacy on-premises Docker
deployment.  Rationale: message content transits Meta servers in either case;
the Cloud API eliminates infrastructure burden and version management.

### 3. Template Strategy

All business-initiated messages use pre-approved Utility templates:

| Template | Category | Content (abbreviated) | Quick Action |
|----------|----------|----------------------|--------------|
| `instruction_offer` | Utility | New instruction summary | "View in CoClerk" CTA |
| `diary_clash` | Utility | Clash details | "View Diary" CTA |
| `approval_required` | Utility | Approval prompt | "Review Now" CTA |
| `status_update` | Utility | Status change notification | None |
| `identity_bind` | Authentication | OTP for identity linking | None |

Content restrictions:
- All placeholder values pass through the Redaction Engine
  (`docs/redaction-engine.md`) before insertion.
- **LPP-flagged matters** (ADR 0007): the template body contains only a
  generic prompt ("Action required on a matter") with a secure Web UI link.
  No case details are transmitted to Meta.

### 4. Quick-Action Model

- **Low-risk actions** (accept, decline, view): handled via interactive
  button replies directly through the Channel Bridge.
- **High-risk actions** (fee approval, conflict override): the message
  contains a CTA button linking to the secure Web UI.  The action executes
  only after authentication in the browser.  Per
  `docs/channel-bridge-security.md` §4, high-risk actions never execute
  directly via messaging.

### 5. Identity Binding & Security

- Barristers link their WhatsApp number via a one-time verification flow in
  the CoClerk Web UI.  The `identity_bind` authentication template delivers
  a 6-digit OTP.
- The phone number is stored as a one-way cryptographic hash
  (`whatsapp_phone_hash` column in the `users` table — see
  `packages/database/src/schema.ts`).
- The `whatsapp_opt_in` boolean column tracks explicit consent per user.

### 6. Fallback — Descoping to Email + In-App

If WhatsApp integration is blocked at a given chambers (Meta Business
Account not created, verification rejected, or policy decision), the Channel
Bridge degrades gracefully:

| Channel | Availability | Quick-Action support |
|---------|:---:|:---:|
| **In-App (PWA)** | Always | Full (buttons + forms) |
| **Email (SMTP)** | Always | Links to Web UI only |
| **WhatsApp** | Opt-in | Interactive buttons for Low-risk; CTA links for High-risk |

The `ChannelAdapter` interface in the Channel Bridge ensures all three
channels are pluggable implementations of the same contract:

```typescript
interface ChannelAdapter {
  channel: 'whatsapp' | 'email' | 'in_app' | 'signal' | 'sms';
  send(userId: string, template: TemplateId, params: Record<string, string>): Promise<DeliveryResult>;
  parseInbound?(raw: InboundMessage): ParsedCommand | null;
}
```

Email and in-app adapters ship as the v1 baseline.  WhatsApp is additive.

## Alternatives Considered

1. **WhatsApp as mandatory** — Rejected.  Creates a hard dependency on a
   third-party platform and Meta Business Account for every deployment.
2. **On-Premises API** — Rejected.  Same data-transit properties as Cloud
   API but adds Docker hosting burden.  No security advantage.
3. **Twilio as intermediary** — Deferred.  Twilio's WhatsApp API wraps Meta's
   and adds cost.  Useful if CoClerk later wants multi-channel abstraction
   but unnecessary for v1.
4. **Signal only** — Rejected for v1.  Signal's bot API is less mature and
   has no interactive button support.  May be added in v2.

## Consequences

- **Per-chambers configuration**: Chambers IT must complete Meta Business
  Verification and provide a System User Token and phone number.  CoClerk
  stores these in the chambers-level encrypted configuration.
- **Cost**: ~£6–7/month per chambers — negligible against operating costs.
- **Privacy disclosure**: Chambers using WhatsApp must disclose Meta as a
  data processor in their privacy notice.
- **No LPP data via WhatsApp**: Any matter flagged `has_lpp_data = true`
  (ADR 0007) results in a content-free notification with a Web UI link.
- **Graceful degradation**: Disabling WhatsApp does not reduce core
  functionality — email + in-app cover all workflows.

## References

- Spike document: `docs/spikes/whatsapp-api.md`
- Channel Bridge threat model: `docs/channel-bridge-security.md`
- Redaction specification: `docs/redaction-engine.md`
- LPP classification: `docs/adr/0007-lpp-classification.md`
- Database schema (opt-in columns): `packages/database/src/schema.ts`
