# CoClerk — Technical Architecture

> **Version:** 0.1.0-draft
> **Date:** 2026-04-08
> **Licence:** MIT
> **Status:** Architecture design — pre-implementation

## 1. Project Summary

**CoClerk** is an open-source, self-hosted AI interface for barristers' chambers in England and Wales. It sits alongside existing chambers management software (Opus 2 LEX, Advanced MLC, BarBooks) as an intelligent coordination layer that reduces information asymmetry between barristers and clerks, automates low-risk administrative tasks, and enforces human oversight on high-risk decisions.

### Core Design Principles

1. **Hybrid deployment** — Core application self-hosted within chambers infrastructure. LLM calls route to cloud providers via a provider-agnostic abstraction layer.
2. **Data sovereignty** — All case data, diary records, fee information, and communications remain on chambers infrastructure. Only LLM prompts (with configurable redaction) leave the chambers network.
3. **Model-agnostic** — Claude, GPT, Gemini, and local models (via Ollama) supported through a unified provider interface.
4. **CMS-first** — Designed to integrate with LEX, MLC, and BarBooks from day one. CoClerk does not replace the CMS — it augments it.
5. **MCP plugin architecture** — Extensible via Model Context Protocol servers for maps, legislation, court knowledge, and future integrations.
6. **Role-aware permissions** — 5-tier clerk hierarchy + barrister role, with configurable permission boundaries per chambers.
7. **MIT licence** — Maximum permissiveness for adoption across chambers of all sizes.

---

## 2. System Architecture

### 2.1 High-Level Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     CHAMBERS NETWORK (self-hosted)                │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  Web UI       │  │  Mobile UI   │  │  Channel Bridge         │  │
│  │  (clerk desk) │  │  (barrister) │  │  (WhatsApp / Signal /   │  │
│  │               │  │  PWA/native  │  │   Email / SMS)          │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬────────────┘  │
│         │                 │                       │               │
│         └────────────┬────┴───────────────────────┘               │
│                      │                                            │
│              ┌───────▼─────────┐                                  │
│              │  API Gateway &   │ ◄── Authentication              │
│              │  Permission      │     Role-based access control   │
│              │  Engine          │     Risk-tier enforcement        │
│              └───────┬─────────┘                                  │
│                      │                                            │
│         ┌────────────┼─────────────────┐                          │
│         │            │                 │                          │
│  ┌──────▼──────┐ ┌──▼───────────┐ ┌──▼───────────────┐          │
│  │ Workflow     │ │ Data Layer   │ │ MCP Plugin Host   │          │
│  │ Engine      │ │              │ │                    │          │
│  │ • Intake    │ │ • Cases      │ │ • Maps MCP         │          │
│  │ • Diary     │ │ • Diary      │ │ • Court KB MCP     │          │
│  │ • Lifecycle │ │ • Fees       │ │ • Doc Analysis MCP │          │
│  │ • Billing   │ │ • Comms log  │ │ • i.AI Lex MCP     │          │
│  │ • Comms     │ │ • Audit trail│ │ • [Community]       │          │
│  │ • Reviews   │ │ • Court KB   │ │                    │          │
│  └──────┬──────┘ └──┬──────────┘ └──┬────────────────┘          │
│         │           │               │                            │
│         └─────┬─────┴───────────────┘                            │
│               │                                                  │
│       ┌───────▼─────────┐      ┌───────────────────┐            │
│       │ CMS Adapter      │◄───►│ LEX / MLC /        │            │
│       │ Layer             │     │ BarBooks            │            │
│       │ (bidirectional)   │     │ (existing CMS)      │            │
│       └───────┬──────────┘     └───────────────────┘            │
│               │                                                  │
└───────────────┼──────────────────────────────────────────────────┘
                │
        ┌───────▼─────────┐
        │  LLM Provider    │  ◄── CLOUD (configurable)
        │  Abstraction     │
        │                  │
        │  ┌──────┐ ┌───┐ │
        │  │Claude│ │GPT│  │
        │  └──────┘ └───┘ │
        │  ┌──────┐ ┌────┐│
        │  │Gemini│ │Local││
        │  └──────┘ └────┘│
        └──────────────────┘
```

### 2.2 Component Descriptions

#### Client Layer

Three access points, matched to how clerks and barristers actually work:

**Web UI (clerk desk)**
Full-featured desktop interface for clerks. Dashboard views, diary management, allocation tools, billing, practice review packs, EDI reporting. Built as a web application deployable on chambers' internal network or accessible via VPN.

- Primary users: Practice Directors, Senior Clerks, Practice Managers, Junior Clerks, Fees Clerks
- Tech: React or similar SPA framework; communicates with API Gateway via REST/WebSocket

**Mobile UI (barrister)**
Streamlined interface optimised for the "30-second court break" interaction pattern. Notification queue with quick actions (accept/decline/defer), diary view, court travel info, matter timeline, personal dashboards.

- Primary users: Barristers
- Tech: Progressive Web App (PWA) for cross-platform reach, with optional native wrappers for iOS/Android

**Channel Bridge**
Connects to messaging platforms so barristers who don't want another app can interact via existing channels. Inspired by OpenClaw's multi-channel design but with critical differences: the bridge is a *relay*, not an autonomous agent. It delivers notifications and receives structured responses. It does not execute actions autonomously.

- Supported channels: WhatsApp (via Business API), Signal, SMS, Email
- Function: Notification delivery + structured response capture (quick actions only)
- Security: No case data transmitted in message content — notifications contain references, not substance. Barrister taps through to the secure UI for detail.

#### API Gateway & Permission Engine

Every request passes through this layer. It enforces:

- **Authentication:** Identity verification (SSO, OAuth 2.0, or local credentials)
- **Role mapping:** Maps authenticated user to their role tier (Practice Director → Junior Clerk → Barrister)
- **Risk-tier enforcement:** Checks whether the requested action is Low (auto-execute) or High (require confirmation). Returns a confirmation prompt for High-risk actions.
- **Configurable overrides:** Reads chambers-level settings (e.g. "enable barrister fee benchmarks", "single-step comms approval") and adjusts permission checks accordingly.
- **Rate limiting and audit logging:** Every API call is logged with timestamp, user, action, and outcome.

#### Workflow Engine

Orchestrates the six phases defined in the feature specification. Each phase is implemented as a module with:

- Defined state transitions (e.g. matter lifecycle: instructed → papers received → prep → hearing → post-hearing → closed)
- Trigger conditions (e.g. "new email in chambers inbox" triggers Intake module)
- Confirmation gates (High-risk actions pause and await human confirmation)
- LLM calls (when AI reasoning is needed: drafting, summarising, suggesting, classifying)
- Data layer reads/writes
- MCP plugin calls (when external data is needed: legislation, maps, court knowledge)

Modules:
1. **Intake** — Instruction parsing, conflict checking, counsel matching, allocation logging
2. **Diary** — Scheduling, prep time calculation, clash detection, returns suggestions, CMS sync
3. **Lifecycle** — Matter status tracking, paper chasing, handover summaries, checklist generation
4. **Billing** — Fee note drafting, aged debt monitoring, payment alerts, benchmark calculation
5. **Comms** — Communication trail aggregation, draft generation, notification routing, broadcast
6. **Reviews** — Practice review pack generation, scheduling, action point tracking, EDI reporting

#### Data Layer

All persistent data stored on chambers infrastructure. Database: **PostgreSQL**.

**Core tables / domains:**

| Domain | Key entities | Notes |
|--------|-------------|-------|
| Users & Roles | users, roles, chambers_config | 5-tier clerk hierarchy + barrister; chambers-level settings |
| Cases / Matters | matters, matter_lifecycle_events, conflict_records | Lifecycle state machine; linked to CMS matter IDs |
| Diary | diary_entries, availability_blocks, clash_alerts | Synced bidirectionally with CMS and Outlook |
| Fees | fee_agreements, fee_notes, payments, aged_debt_snapshots | Draft fee notes require approval before send |
| Communications | comms_log, notification_queue, broadcast_log | Matter-linked; channel-agnostic |
| Allocation | allocation_decisions, allocation_reasoning_log | Editable with full audit trail (original always recoverable) |
| Practice Reviews | review_schedules, review_packs, action_points | Action points resurface in relevant workflow contexts |
| Court Knowledge | court_files (markdown-backed), contributions | Community-maintained; PR-based contribution model |
| Audit | audit_log | Every action, every edit, timestamped, attributed |

**Data retention:** Configurable per chambers in line with BSB and GDPR requirements. The system prompts for retention policy configuration during setup and surfaces retention obligations contextually.

#### CMS Adapter Layer

Bidirectional sync with existing chambers management software. Each CMS gets its own adapter module implementing a common interface.

```
interface CMSAdapter {
  // Diary
  readDiaryEntries(barristerId, dateRange): DiaryEntry[]
  writeDiaryEntry(entry: DiaryEntry): Result
  deleteDiaryEntry(entryId): Result

  // Matters
  readMatters(filters): Matter[]
  readMatterDetail(matterId): MatterDetail
  updateMatterStatus(matterId, status): Result

  // Fees
  readFeeAgreements(matterId): FeeAgreement[]
  readOutstandingFees(filters): FeeNote[]
  submitFeeNote(feeNote: FeeNote): Result

  // Contacts
  readSolicitors(filters): Solicitor[]
  readSolicitorPaymentHistory(solicitorId): PaymentRecord[]

  // Sync
  getLastSyncTimestamp(): DateTime
  fullSync(): SyncReport
  incrementalSync(since: DateTime): SyncReport
}
```

**Day-one adapters:** LEX, MLC, BarBooks

**⚠️ Research spike required:** The API availability and integration methods for LEX, MLC, and BarBooks are not publicly documented. Adapters may need to work via:
- Direct API (if available)
- Database-level read access (if permitted by the vendor)
- Outlook calendar sync (as a proxy for diary data)
- CSV/spreadsheet import/export (as a fallback)
- Webhook or event listeners (if supported)

This spike should be the first technical investigation before implementation begins. The adapter interface is designed to be implementation-agnostic — the rest of the system doesn't care how the adapter gets the data.

#### MCP Plugin Host

Hosts Model Context Protocol servers for extensible functionality. Each plugin runs as an independent MCP server that the workflow engine can call.

| Plugin | Status | Source | Purpose |
|--------|--------|--------|---------|
| **Maps MCP** | Build from scratch | Custom | Google Maps / Apple Maps integration for door-to-door travel instructions, journey time estimates, and diary-aware travel alerts |
| **Court Knowledge Base MCP** | Build from scratch | Custom | Serves the community-maintained court/tribunal markdown files to the LLM with structured retrieval |
| **Document Analysis MCP** | Build from scratch | Custom | Processes uploaded briefs and bundles (extraction, summarisation). All outputs go through the B3.3 mandatory verification gate |
| **i.AI Lex MCP** | Connect to existing | [github.com/i-dot-ai/lex](https://github.com/i-dot-ai/lex) | UK legislation semantic search, statutory text retrieval, citation verification. MIT licensed. Built by DSIT/Cabinet Office with National Archives and MOJ. **⚠️ Experimental service — design for graceful degradation** |
| **Community plugins** | Future | Open contribution | Audited plugin model — community can build and submit plugins via PR. Reviewed before inclusion. No auto-install from unvetted registries (unlike OpenClaw's ClawHub model) |

**Plugin security model (lessons from OpenClaw):**
- Plugins run in sandboxed processes with defined capability boundaries
- No plugin gets shell access, file system access outside its sandbox, or network access beyond its declared endpoints
- All plugins are reviewed before inclusion in the official registry
- Chambers can restrict which plugins are active via configuration
- Plugin actions are logged in the audit trail

#### LLM Provider Abstraction

A clean interface that any provider can plug into. The system never sends data to a provider without applying the configured redaction rules first.

```
interface LLMProvider {
  complete(prompt: string, context: Context, options: ProviderOptions): CompletionResponse
  summarise(document: Document, instructions: string): SummaryResponse
  draft(templateType: TemplateType, data: Record): DraftResponse
  classify(input: string, categories: Category[]): ClassificationResponse
}
```

**Supported providers at launch:**

| Provider | Model examples | Notes |
|----------|---------------|-------|
| Anthropic Claude | Claude Opus, Claude Sonnet | Via Anthropic API |
| OpenAI GPT | GPT-4o, GPT-5 | Via OpenAI API |
| Google Gemini | Gemini 3 Pro | Via Google AI API |
| Local models | Llama, Mistral, etc. | Via Ollama or compatible local inference server |

**Redaction engine:**
Before any prompt is sent to a cloud LLM provider, the redaction engine processes it according to chambers configuration:

| Redaction level | What's sent to LLM | What's redacted |
|----------------|--------------------|-----------------| 
| **Maximum** (safe default) | Case type, legal issues, generic task instructions | All names (clients, solicitors, barristers, witnesses), addresses, dates of birth, case numbers, court file references |
| **Moderate** | Above + court names, hearing dates, statutory references | Personal names, addresses, dates of birth |
| **Minimum** | Most case context | Only the most sensitive PII (dates of birth, addresses, financial amounts) |
| **None** (local models only) | Everything | Nothing — only available when using a local model on chambers infrastructure |

Default: **Maximum**. Configurable by Practice Director.

When using local models via Ollama, redaction can be disabled entirely since no data leaves the chambers network.

---

## 3. Data Flow Examples

### 3.1 New Instruction Arrives

```
1. Solicitor emails chambers shared inbox
       │
2. Channel Bridge (or clerk manually) captures the email
       │
3. Workflow Engine → Intake module triggered
       │
4. LLM Provider called to extract structured fields
   (solicitor, case type, court, dates, funding model)
   Redaction rules applied before prompt sent
       │
5. Data Layer queried for conflict check
   (all active matters, all barristers)
       │
6. CMS Adapter reads current diary availability
   from LEX/MLC/BarBooks
       │
7. Workflow Engine generates:
   - Conflict check result
   - Ranked counsel shortlist (expertise + availability + workload)
   - Suggested fee range (from historical data via C4.4)
       │
8. Web UI presents to Practice Manager for review
   [LOW RISK — auto-generated, read-only suggestions]
       │
9. PM selects barrister → allocation reasoning logged
   [HIGH RISK — confirmation required; audit trail written per C1.4]
       │
10. Mobile UI / Channel Bridge notifies barrister
    with structured summary + accept/decline quick action
       │
11. Barrister confirms → CMS Adapter writes booking to diary
    [HIGH RISK — diary modification; confirmation built into tap action]
       │
12. Workflow Engine drafts solicitor confirmation email
    → PM reviews and sends
    [HIGH RISK — outbound communication; confirmation required per C5.3]
```

### 3.2 Barrister Asks "How Do I Get To Court?"

```
1. Barrister sends query via Mobile UI or Channel Bridge:
   "How do I get to the Royal Courts of Justice tomorrow?"
       │
2. Workflow Engine identifies:
   - Target venue: Royal Courts of Justice
   - Relevant diary entry: hearing tomorrow at 10:30am
       │
3. Court KB MCP serves the markdown file:
   courts/england-and-wales/royal-courts-of-justice.md
   (building layout, security, robing rooms, accessibility, local tips)
       │
4. Maps MCP called with:
   - Origin: barrister's home postcode (from profile) or current location
   - Destination: Royal Courts of Justice, Strand, London WC2A 2LL
   - Arrival time: 10:00am (30 min before hearing, per court KB advice)
       │
5. LLM Provider synthesises:
   - Travel instructions (transit route, estimated journey time)
   - Court building tips from the KB file
   - Reminder of hearing details from diary
       │
6. Response delivered to barrister
   [LOW RISK — read-only; no data modified]
```

### 3.3 Citation Verification

```
1. Barrister requests AI summary of a brief
       │
2. Document Analysis MCP extracts text, key dates, legal issues
       │
3. LLM Provider generates summary with statutory/caselaw citations
       │
4. i.AI Lex MCP called to verify each citation:
   - Does this Act/SI exist?
   - Is the section number valid?
   - Is the quoted text accurate?
   - Has it been amended or repealed?
       │
5. Verification results appended to summary:
   ✅ Equality Act 2010, s.15 — verified, current
   ✅ SI 2014/2833 — verified, current
   ⚠️ Employment Rights Act 1996, s.98(4) — verified but amended 2024
   ❌ Disability Discrimination Act 1995, s.3A — repealed, replaced by EA 2010
       │
6. Summary presented with verification badges
   + mandatory B3.3 verification gate
   [HIGH RISK — barrister must confirm before relying on or sharing]
```

---

## 4. API Surface

### 4.1 REST API Structure

The API follows a resource-oriented design. All endpoints require authentication and are subject to role-based access control.

```
/api/v1/
├── /auth
│   ├── POST   /login
│   ├── POST   /logout
│   └── GET    /me
│
├── /matters
│   ├── GET    /                    # List matters (filtered by role)
│   ├── GET    /:id                 # Matter detail
│   ├── POST   /                    # Create matter (from intake)
│   ├── PATCH  /:id/status          # Update matter status [HIGH]
│   ├── GET    /:id/timeline        # Matter timeline
│   ├── GET    /:id/comms           # Communication trail
│   └── GET    /:id/handover        # Handover summary (for returns)
│
├── /diary
│   ├── GET    /                    # Diary entries (scoped by role)
│   ├── POST   /                    # Create entry [HIGH]
│   ├── PATCH  /:id                 # Update entry [HIGH]
│   ├── DELETE /:id                 # Delete entry [HIGH]
│   ├── GET    /clashes             # Clash detection view
│   ├── POST   /availability-block  # Mark unavailability [HIGH]
│   └── GET    /prep-estimate/:matterId  # Prep time estimate
│
├── /fees
│   ├── GET    /dashboard           # Financial dashboard (scoped)
│   ├── GET    /aged-debt           # Aged debt view
│   ├── POST   /fee-note/draft      # Generate draft fee note [HIGH]
│   ├── POST   /fee-note/:id/approve # Approve fee note [HIGH]
│   ├── POST   /fee-note/:id/send   # Send to solicitor [HIGH]
│   ├── POST   /time-entry          # Log time [HIGH]
│   └── GET    /benchmarks          # Anonymised benchmarks (if enabled)
│
├── /allocation
│   ├── POST   /suggest             # Ranked counsel shortlist
│   ├── POST   /decide              # Record allocation decision [HIGH]
│   ├── GET    /log                 # Allocation reasoning log
│   └── GET    /edi-report          # EDI distribution report
│
├── /comms
│   ├── GET    /pending             # Pending items for current user
│   ├── POST   /draft               # Generate draft communication [HIGH]
│   ├── POST   /send                # Send communication [HIGH]
│   ├── POST   /broadcast           # Broadcast to group [HIGH]
│   └── GET    /trail/:matterId     # Unified comms trail
│
├── /reviews
│   ├── GET    /schedule            # Review schedule
│   ├── GET    /pack/:barristerId   # Practice review pack
│   ├── POST   /action-point        # Record action point [HIGH]
│   ├── GET    /action-points       # List action points
│   └── POST   /wellbeing-flag      # Wellbeing concern [HIGH]
│
├── /courts
│   ├── GET    /                    # List all court KB files
│   ├── GET    /:slug               # Court detail (from markdown)
│   ├── POST   /contribute          # Submit contribution [HIGH - PR]
│   └── GET    /travel              # Travel instructions (via Maps MCP)
│
├── /ai
│   ├── POST   /summarise           # Summarise document [triggers B3.3 gate]
│   ├── POST   /verify-citations    # Verify citations via i.AI Lex
│   ├── POST   /extract-fields      # Extract structured data from text
│   └── POST   /draft-comms         # Draft communication
│
├── /config
│   ├── GET    /chambers            # Chambers-level settings
│   ├── PATCH  /chambers            # Update settings [Practice Director only]
│   ├── GET    /my-preferences      # User preferences
│   └── PATCH  /my-preferences      # Update user preferences
│
└── /admin
    ├── GET    /audit-log           # Full audit trail [Practice Director]
    ├── GET    /sync-status         # CMS sync health
    └── POST   /sync/force          # Force CMS sync [HIGH]
```

### 4.2 WebSocket Events

For real-time updates (diary changes, new notifications, clash alerts):

```
ws://chambers-host/ws/v1/events

Events emitted:
  diary.entry.created
  diary.entry.updated
  diary.clash.detected
  matter.status.changed
  matter.papers.overdue
  fee.payment.received
  fee.note.overdue
  notification.new
  allocation.new
  review.reminder
```

---

## 5. Court & Tribunal Knowledge Base

### 5.1 Purpose

Barristers regularly travel to courts and tribunal buildings they've never visited. Large complexes (the RCJ has 80+ courtrooms), regional centres visited infrequently, and tribunal hearing rooms in unfamiliar office buildings all create practical anxiety — especially for junior barristers, those with accessibility needs, or anyone attending a venue for the first time.

This knowledge currently lives in barristers' heads or informal corridor conversations. CoClerk externalises it as a structured, community-maintained knowledge base.

### 5.2 Repository Structure

```
courts/
├── README.md                              # Contributing guide
├── TEMPLATE.md                            # Standard template for new files
├── england-and-wales/
│   ├── london/
│   │   ├── royal-courts-of-justice.md
│   │   ├── central-london-employment-tribunal.md
│   │   ├── central-london-county-court.md
│   │   ├── old-bailey.md
│   │   └── ...
│   ├── south-east/
│   │   ├── reading-crown-court.md
│   │   └── ...
│   ├── midlands/
│   │   ├── birmingham-civil-justice-centre.md
│   │   └── ...
│   ├── north-west/
│   │   ├── manchester-civil-justice-centre.md
│   │   └── ...
│   └── ...
└── tribunals/
    ├── employment/
    │   ├── london-central.md
    │   ├── london-south.md
    │   └── ...
    ├── immigration/
    │   └── ...
    └── ...
```

### 5.3 Court File Template

```markdown
# [Court/Tribunal Name]

## Location
- **Address:** [Full address including postcode]
- **Coordinates:** [lat, lng — for Maps MCP]
- **What3Words:** [optional]

## Getting There
- **Nearest tube/rail:** [Station name, line(s), walk time]
- **Bus routes:** [Relevant routes]
- **Parking:** [Availability, cost, nearest car parks]
- **Cycling:** [Bike storage availability]

## Arrival
- **Security:** [What to expect — bag search, metal detector, ID requirements]
- **Which entrance:** [Main entrance location; any restricted entrances]
- **Recommended arrival time:** [How early before hearing]
- **Check-in process:** [Where to announce arrival]

## Inside the Building
- **Court/room locations:** [Floor layout, how to find your room]
- **Robing room:** [Location, availability, any notes]
- **Conference rooms:** [Availability, booking requirements]
- **Wi-Fi:** [Network name, how to connect, reliability]
- **Printing/copying:** [Availability]

## Accessibility
- **Step-free access:** [Routes, lifts]
- **Hearing loops:** [Availability by courtroom]
- **Accessible toilets:** [Location]
- **Other:** [Any other accessibility notes]

## Food & Drink
- **Building facilities:** [Canteen, vending machines]
- **Nearby options:** [Cafés, sandwich shops within 5 min walk]

## Local Knowledge
- [Community-contributed tips — e.g. "The canteen closes at 2pm",
  "Court 7 is through the unmarked door past reception",
  "Security queue is 15+ minutes on Monday mornings"]

## Last Verified
- **Date:** [YYYY-MM-DD]
- **By:** [Contributor handle or "anonymous"]
```

### 5.4 Contribution Model

Contributions follow a pull request model:
1. Barrister visits a court and has new information
2. Submits via CoClerk UI (B2.6) which creates a PR against the court KB repo
3. PR is reviewed by a maintainer (could be a designated clerk or volunteer barrister)
4. Merged if accurate and appropriate
5. Automatically available to all CoClerk instances via the Court KB MCP

---

## 6. Security Model

### 6.1 Lessons from OpenClaw

CoClerk's architecture is inspired by OpenClaw's multi-channel, model-agnostic design but explicitly addresses the security vulnerabilities documented in OpenClaw deployments:

| OpenClaw vulnerability | CoClerk mitigation |
|-----------------------|-------------------|
| Root-level system access for the agent | CoClerk agent has no shell access. It operates via defined API endpoints only. |
| Exposed admin interfaces on the internet | Web UI bound to chambers internal network or VPN. No public-facing admin surface. |
| Untrusted community skills with arbitrary side effects | Audited plugin model. All plugins reviewed before inclusion. No auto-install from unvetted registries. |
| Prompt injection via email/document content | LLM prompts are constructed by the workflow engine, not from raw user/document content. Document content is passed as data, not as instructions. |
| Long-lived credentials stored by the agent | Credentials managed via chambers' existing identity infrastructure. CoClerk stores OAuth tokens encrypted at rest with short expiry and refresh. |
| Localhost trust bypass via misconfigured reverse proxy | Authentication required on all requests regardless of origin. No localhost trust exemption. |

### 6.2 Data Protection

- All data at rest encrypted (PostgreSQL with TDE or application-level encryption)
- All data in transit encrypted (TLS 1.3)
- LLM prompts redacted before transmission to cloud providers (configurable levels)
- Audit trail captures all data access and modifications
- GDPR-compliant data retention with configurable policies
- Right to erasure supported at the data layer

### 6.3 Authentication & Authorisation

- Integration with chambers' existing identity provider (Azure AD, Google Workspace, or local credentials)
- Role-based access control enforced at API Gateway level
- Session management with configurable timeout
- Multi-factor authentication recommended for Practice Director and Senior Clerk roles

---

## 7. Development Tooling Strategy

Given the available AI coding tools, the recommended development workflow is:

| Tool | Role in CoClerk development |
|------|---------------------------|
| **Claude (Chat / Claude Code / Cowork)** | Architecture decisions, documentation, code review, feature specification refinement, complex problem-solving. Primary "thinking partner" for the project. |
| **Google Jules** | Background scaffolding tasks: generating boilerplate for CMS adapters, writing test suites, creating court KB markdown templates in bulk, refactoring modules. Jules works asynchronously and submits PRs for review. |
| **Google Antigravity** | Multi-agent orchestration for parallel development: building multiple CMS adapters simultaneously, working on separate workflow modules in parallel. Use the manager view to oversee agent work. |
| **OpenAI Codex** | Real-time coding companion for focused sessions: inline completions, quick function generation, syntax help when actively writing code in an editor. |

**Development pattern:** Jules scaffolds → Antigravity orchestrates parallel work → Codex assists in real-time sessions → Claude reviews and makes architectural decisions.

---

## 8. Open-Source Licensing

### Licence: MIT

```
MIT License

Copyright (c) 2026 CoClerk Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Compatibility Notes

- MIT is compatible with the i.AI Lex project (also MIT licensed)
- MIT is compatible with all major LLM provider SDKs
- MIT allows commercial use, modification, and redistribution without restriction
- MIT does not include a patent grant — if patent protection becomes a concern, Apache 2.0 is the recommended alternative (this can be changed before v1.0 if needed)

---

## 9. Repository Structure (Proposed)

```
coclerk/
├── README.md
├── LICENSE                          # MIT
├── CONTRIBUTING.md
├── FEATURE_SPEC.md                  # This feature specification
├── ARCHITECTURE.md                  # This document
│
├── apps/                            # Executable applications
│   ├── api/                         # Node/Express API Gateway & services
│   ├── web-clerk/                   # Clerk Desktop React application
│   ├── web-barrister/               # Barrister Mobile-first React application
│   └── worker/                      # Background job processing
│
├── packages/                        # Shared libraries and internal dependencies
│   ├── domain/                      # Core entities, roles, auth, and risk tiers
│   ├── database/                    # PostgreSQL schema, repositories, and migrations
│   ├── ui/                          # Shared design tokens and React components
│   ├── shared/                      # Common types and utilities
│   ├── config/                      # Environment and feature-flag definitions
│   └── workflow-engine/             # Orchestration hooks and states
│
├── docs/                            # Documentation 
│   ├── adr/                         # Architecture Decision Records
│   └── architecture-phase1.md       # Implementation guide for phases
│
├── docker-compose.yml               # Local development stack
└── .github/
    ├── ISSUE_TEMPLATE/
    └── workflows/                   # CI/CD
```

Tests are currently co-located alongside their source files (e.g. `feature.ts` -> `feature.test.ts`), abandoning the legacy `tests/` centralized structure.

---

## 10. Research Spikes (Pre-Implementation)

The following unknowns must be investigated before implementation begins:

| # | Spike | Why it matters | Suggested approach |
|---|-------|---------------|-------------------|
| 1 | **CMS API availability** (LEX, MLC, BarBooks) | The entire CMS adapter layer depends on knowing what integration methods exist. | Contact vendors directly; examine existing Outlook sync mechanisms; test database access if available; assess CSV import/export as fallback. |
| 2 | **Court listing data feeds** | C2.5 and C2.6 depend on receiving listing changes. No public APIs documented. | Investigate HMCTS APIs; check for RSS/email notification services from courts; assess screen-scraping feasibility and legality. |
| 3 | **i.AI Lex production readiness** | Currently flagged as experimental. We need to understand uptime, rate limits, and data freshness. | Deploy locally using their Docker setup; test API reliability; engage with i.AI team via GitHub issues. |
| 4 | **WhatsApp Business API constraints** | Channel Bridge for WhatsApp has specific approval requirements and message template restrictions. | Review Meta Business API documentation; assess whether notification-only use qualifies for standard approval. |
| 5 | **BSB regulatory review** | The allocation reasoning log (C1.4) and EDI reporting (C6.4) features may have specific regulatory expectations. | Consult BSB guidance on rC110 implementation; review published fair access monitoring examples. |

---

## 11. Design Decision: B2.1 — Opaque Unavailability

### What it does

B2.1 allows barristers to mark diary blocks as "firm unavailability" without disclosing the reason to the clerks' room. The clerk sees "unavailable — firm" but not whether the reason is a medical appointment, a caring responsibility, a mental health day, or anything else.

### Why it's designed this way

The research reports document two interconnected problems:

1. **The "fear factor"** — barristers, especially women with caring responsibilities, worry that disclosing the reason for unavailability will lead to being sidelined or deemed "unreliable" by the clerks' room. This leads to over-commitment and poor wellbeing.

2. **The culture of stoicism** — barristers report difficulty in speaking up about personal challenges, mental health, or capacity limits. Nearly one-third report struggling to cope.

Opaque unavailability addresses both by removing the need to justify personal time. The system treats "unavailable — firm" identically to "in court" from a diary-management perspective — the clerk simply cannot book work into that slot.

### The trade-off

This creates a new information asymmetry in the opposite direction: the clerk loses visibility that may be operationally useful (e.g. knowing a barrister has a recurring medical commitment every Thursday afternoon helps with long-term diary planning).

### How it's resolved

The feature is configurable:
- **Default:** Opaque. Clerk sees "unavailable — firm" only.
- **Optional setting:** Senior Clerk visibility can be enabled at chambers level. When enabled, the Senior Clerk (and only the Senior Clerk) can see the category of reason (not the detail) — e.g. "caring" or "medical" — but this requires explicit chambers-level configuration and cannot be enabled by individual clerks.

The barrister is always informed of the current visibility setting and can see exactly what their clerk will see before confirming the block.

---

## 12. Glossary

| Term | Definition |
|------|-----------|
| **Barrister** | Self-employed legal practitioner regulated by the BSB, practising from chambers |
| **Brief** | The set of instructions and papers sent by a solicitor to a barrister for a case |
| **BSB** | Bar Standards Board — the regulator for barristers in England and Wales |
| **Cab-rank rule** | BSB rule requiring barristers to accept instructions in their area of practice if available |
| **Chambers** | The business unit from which self-employed barristers practise, with shared clerking staff |
| **Clash** | A scheduling conflict where a barrister is booked for two hearings at the same time |
| **CMS** | Chambers Management Software (e.g. LEX, MLC, BarBooks) |
| **EDI** | Equality, Diversity, and Inclusion — regulatory monitoring for fair access to work |
| **Fees Clerk** | A specialized clerk role responsible for billing and financial record-keeping |
| **Fixing** | The process of negotiating a hearing date with the court listing office |
| **IBC** | Institute of Barristers' Clerks — the professional body for clerks |
| **MCP** | Model Context Protocol — an open standard for connecting AI models to external tools and data |
| **MFA** | Multi-Factor Authentication — a security mechanism requiring multiple forms of verification |
| **NER** | Named Entity Recognition — the identification and categorization of key entities in text |
| **Practice review** | A structured periodic meeting between a barrister and their clerk to discuss practice development |
| **PWA** | Progressive Web App — a web application with native-like installation and features |
| **Return** | Reallocation of a case to a different barrister when original counsel becomes unavailable |
| **TDE** | Transparent Data Encryption — database-level encryption of data at rest |
| **Warned list** | A court list of cases that may be called during a particular week but without a fixed date |
