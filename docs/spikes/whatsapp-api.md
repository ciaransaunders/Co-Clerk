# Spike: WhatsApp Business API Feasibility for CoClerk

> **Date:** 2026-04-10
> **Author:** CoClerk Engineering
> **Status:** Complete — findings feed into ADR 0010

## 1. Objective

Evaluate whether the Meta WhatsApp Business API (Cloud API) is viable as a
notification and quick-action channel for barristers in CoClerk v1.  If blocked,
recommend an alternative v1 channel strategy.

## 2. API Options

Meta offers two API paths for programmatic WhatsApp access:

| Path | Hosting | Approval | Cost model |
|------|---------|----------|------------|
| **Cloud API** (recommended by Meta) | Hosted by Meta | Business Verification + System User Token | Per-conversation pricing (Utility / Authentication / Marketing / Service) |
| **On-Premises API** (legacy) | Self-hosted Docker containers | Same verification + infrastructure | Same per-conversation pricing, plus hosting costs |

**Recommendation:** Cloud API.  Self-hosting the WhatsApp API adds operational
burden with no security benefit for CoClerk's use case — the message content is
already transmitted to Meta's servers regardless of hosting model.  The Cloud API
also eliminates version management overhead.

## 3. Meta Business Verification Requirements

Before sending messages at scale, Meta requires:

1. **Meta Business Account** — requires a valid business entity, address, and
   legal documentation.  For a barristers' chambers this would typically be the
   chambers entity or the clerking company.
2. **Business Verification** — Meta verifies the business identity.  Typical
   turnaround: 2–10 business days.  Requires two of: utility bill, business
   registration certificate, phone bill.  UK barristers' chambers should qualify
   as "Professional Services."
3. **WhatsApp Business Profile** — display name, description, category.
4. **System User Token** — a permanent token (not user-session-bound) used by
   the Channel Bridge service to make API calls.
5. **Phone Number Registration** — a dedicated phone number must be registered
   with the WhatsApp Business Account.  This number cannot be simultaneously
   used with the WhatsApp consumer app.

### Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Verification rejected for a chambers entity | Medium | Chambers are established business entities with Companies House registrations and utility bills.  Low risk in practice. |
| Dedicated phone number required | Low | A dedicated SIM or virtual number (e.g., via Twilio) is inexpensive (~£5/month). |
| Number cannot also run WhatsApp consumer app | Low | This is a dedicated system number, not a personal number. |
| Meta policy changes restrict legal-sector usage | Low | Legal professional services are not in any restricted category. |

## 4. Message Template Categories & Approval

All business-initiated (outbound) messages outside the 24-hour service window
**must** use a pre-approved Message Template.

### Template Categories

| Category | Use case in CoClerk | Per-conversation cost (UK, approx.) | Approval difficulty |
|----------|--------------------|------------------------------------|---------------------|
| **Utility** | Instruction offers, diary clash alerts, approval reminders, status updates | £0.0311 | Low — transactional notifications are straightforward |
| **Authentication** | OTP codes for Web UI login, WhatsApp identity binding | £0.0268 | Low — standard auth flow |
| **Marketing** | Not applicable — CoClerk does not send promotional content | N/A | N/A |
| **Service** | Free-form replies within 24-hour window (barrister replies first) | Free (0 additional charge) | No template needed |

### Template Design for CoClerk v1

| Template ID | Category | Body (with placeholders) | Buttons |
|-------------|----------|--------------------------|---------|
| `instruction_offer` | Utility | `New instruction: {{1}} ({{2}}). Dates: {{3}}. Tap below to review.` | CTA: "View in CoClerk" (URL) |
| `diary_clash` | Utility | `Diary clash detected for {{1}} on {{2}}. {{3}} hearings overlap. Tap to resolve.` | CTA: "View Diary" (URL) |
| `approval_required` | Utility | `Action required: {{1}} for matter {{2}} needs your approval. Tap to review.` | CTA: "Review Now" (URL) |
| `status_update` | Utility | `Matter {{1}} status changed to {{2}}.` | None |
| `identity_bind` | Authentication | `Your CoClerk verification code is {{1}}. Valid for 10 minutes.` | None |

### Template Approval Process

1. Submit template via the Meta Business Manager UI or the `/message_templates`
   API endpoint.
2. Meta reviews within 24 hours (usually faster for Utility templates).
3. Rejected templates can be resubmitted with modifications.
4. Templates are versioned — edits create a new version requiring re-approval.

### Content Restrictions Relevant to CoClerk

- **No sensitive PII in templates.**  The Redaction Engine (see
  `docs/redaction-engine.md`) must process all placeholder values before
  insertion.
- **No consecutive placeholders** — `{{1}}{{2}}` is forbidden; use separators.
- **No LPP-classified content** — per ADR 0007, privileged data must never reach
  Meta's servers.  Templates for LPP-flagged matters must link to the Web UI
  without including case details in the message body.

## 5. Quick-Action via WhatsApp — Feasibility

The "30-second interaction" goal requires barristers to accept/decline/flag
instructions via messaging.  Two approaches:

### Option A: Interactive Buttons (Recommended)
WhatsApp supports up to 3 reply buttons per message.  The `instruction_offer`
template can include `Accept` / `Decline` / `Flag Concern` buttons.

- **Pros:** Single-tap interaction, deterministic parsing, no NLP required.
- **Cons:** Limited to 3 options; complex workflows require Web UI redirect.

### Option B: Free-Text Command Parsing
Barristers type `/accept`, `/decline`, etc.  CoClerk parses inbound messages.

- **Pros:** More flexible.
- **Cons:** Error-prone, requires NLP fallback, training burden on users.

**Recommendation:** Interactive buttons for structured actions;
free-text only within the 24-hour service window for ad-hoc queries (e.g.,
"how do I get to [court]?").

## 6. Security Constraints

All constraints from `docs/channel-bridge-security.md` apply.  Specifically:

1. **High-risk actions cannot execute via WhatsApp** — they redirect to the
   secure Web UI via a CTA button URL.  The button URL contains a
   time-limited, single-use JWT that authenticates the action.
2. **Identity binding** — the `identity_bind` authentication template is used
   during initial setup to link a WhatsApp number to a CoClerk user account.
   The phone number is stored as a one-way cryptographic hash
   (`whatsapp_phone_hash` in the `users` table).
3. **Inbound message handling** — only recognised structured commands and
   button replies are processed.  Free-text messages are echoed back with a
   "I didn't understand — try tapping a button or type /help" fallback.

## 7. Cost Projection

For a 30-barrister chambers with ~15 active matters/week:

| Conversation type | Est. monthly volume | Unit cost | Monthly cost |
|-------------------|--------------------:|----------:|-----------:|
| Utility (instruction offers, alerts) | ~200 | £0.031 | £6.20 |
| Authentication (binding, OTPs) | ~5 | £0.027 | £0.14 |
| Service (within 24h window) | ~100 | Free | £0.00 |
| **Total** | | | **~£6.34** |

Cost is negligible relative to chambers operating expenses.

## 8. Blockers & Fallback Strategy

### Potential Blockers

| Blocker | Likelihood | Impact |
|---------|-----------|--------|
| Meta Business Verification rejected | Very Low | High — cannot use WABA |
| Meta policy change restricts legal sector | Very Low | High — cannot use WABA |
| Chambers unwilling to create Meta Business Account | Medium | High — per-chambers decision |
| Dedicated phone number unavailable | Very Low | Low — virtual numbers available |

### Fallback: Email + In-App for v1

If WhatsApp integration is blocked for any reason, the Channel Bridge will
descope to:

1. **Email** — SMTP-based notifications using the same template content.
   Structured quick-actions are replaced with secure Web UI links.
2. **In-App Push Notifications** — via the PWA service worker for barristers
   who have installed the CoClerk web app.
3. **WhatsApp deferred to v2** — re-evaluated once chambers onboarding reveals
   actual demand and Meta Business Account readiness.

This fallback is codified in ADR 0010 §6 — the v1 Channel Bridge is designed
with a `ChannelAdapter` interface so that email, in-app, and WhatsApp are all
pluggable implementations:

```typescript
interface ChannelAdapter {
  channel: 'whatsapp' | 'email' | 'in_app' | 'signal' | 'sms';
  send(userId: string, template: TemplateId, params: Record<string, string>): Promise<DeliveryResult>;
  parseInbound?(raw: InboundMessage): ParsedCommand | null;
}
```

## 9. Conclusion

WhatsApp Business API integration is **feasible for CoClerk v1** with
manageable cost and moderate setup overhead.  The primary risk is
chambers-level willingness to create a Meta Business Account, which is a
per-deployment configuration concern — not a platform blocker.

The recommended v1 scope for WhatsApp is:
- 5 Utility templates (instruction offer, diary clash, approval, status, binding)
- Interactive button-based quick-actions for Low-risk operations
- High-risk actions redirect to Web UI
- Email + In-App as the universal fallback for chambers without WhatsApp setup
