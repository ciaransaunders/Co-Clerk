# CoClerk — Feature Specification

> **Version:** 0.1.0-draft
> **Date:** 2026-04-08
> **Licence:** MIT
> **Status:** Co-design draft — not yet validated with practising barristers or clerks

## Overview

CoClerk is an open-source AI interface for barristers' chambers in England and Wales, designed to serve both barristers and clerks as equal users. It sits alongside existing chambers management software (LEX, MLC, BarBooks) as an intelligent layer that reduces information asymmetry, automates low-risk administrative tasks, and enforces human oversight on high-risk decisions.

This feature specification is structured around dual personas (Barrister and Clerk) with user stories grouped by workflow phase. Each story is tagged with a risk tier that determines whether the system can auto-execute or must require human confirmation.

## Design Principles

1. **Equal weight to both personas.** Neither barrister nor clerk is the "primary user." Both have distinct jobs-to-be-done at every workflow phase.
2. **Regulatory awareness.** The system operates within BSB Handbook requirements, IBC Code of Conduct standards, and Bar Council practice guidance.
3. **Transparency over automation.** The system surfaces information and makes suggestions; it does not make decisions autonomously on high-risk matters.
4. **Configurable per chambers.** Chambers vary widely in size, structure, and culture. Key features (fee benchmarks, approval steps, wellbeing routing) are configurable by the Practice Director or Senior Clerk.

## Permission Model

### Risk Tiers

| Tier | Definition | System behaviour |
|------|-----------|-----------------|
| **Low** | Read-only queries, personal dashboards, suggestions, alerts, notifications | Auto-executes without confirmation |
| **High** | Actions that modify shared data (diary, case records, fees), create compliance records, generate outbound communications, or involve sensitive disclosures | Requires explicit human confirmation before execution |

### Role Hierarchy

The system supports a 5-tier clerking hierarchy plus the barrister role. Permissions are scoped by role, with the Practice Director having the broadest configuration access.

| Tier | Role | Scope |
|------|------|-------|
| 1 | Practice Director / Chambers Director | Full system configuration, all dashboards, governance reporting |
| 2 | Senior Clerk / Senior Practice Manager | Strategic allocation, fee benchmarks, practice reviews, EDI reporting, team oversight |
| 3 | Practice Manager | Day-to-day diary, instruction triage, fee negotiation, matter management for assigned barristers |
| 4 | Assistant Practice Manager / Junior PM | Supports PMs with administration under supervision |
| 5 | Junior Clerk | Logistical support, court liaison, document handling, basic diary entry |
| — | Barrister | Personal dashboard, case view, approval gates, practice review data, wellbeing tools |

### Configurable Settings (chambers-level)

The following features are controlled by the Practice Director or Senior Clerk:

- Whether barristers can see anonymised fee benchmarks (B4.5)
- Whether AI-drafted communications require single or double approval (clerk + barrister)
- Whether the Senior Clerk has visibility into opaque unavailability blocks (B2.1)
- Practice review reminder frequency
- LLM provider selection and redaction rules
- Notification batching and quiet hours defaults

---

## Phase 1: Instruction Intake & Conflict Checking

### Clerk-Side Stories

| ID | User Story | Risk |
|----|-----------|------|
| C1.1 | As a **Practice Manager**, I want the system to automatically parse incoming instruction emails and extract key fields (solicitor, case type, court, dates, funding model) so that I can triage without manual data entry. | Low |
| C1.2 | As a **Practice Manager**, I want the system to run an automated conflict check against all current matters in chambers when a new instruction arrives, so that I can flag potential conflicts before approaching counsel. | Low |
| C1.3 | As a **Senior Clerk**, I want to see a ranked shortlist of available barristers matched by expertise, seniority, and current workload for each new instruction, so that I can allocate work fairly and in line with our EDI/Work Allocation Policy. | Low |
| C1.4 | As a **Senior Clerk**, I want the system to log the reasoning behind each work allocation decision (who was considered, who was selected, why), so that chambers can demonstrate BSB rC110 compliance on fair access monitoring. The log is editable with a full audit trail — every edit is timestamped and attributed, and the original entry is always recoverable. | **High** |
| C1.5 | As a **Practice Manager**, I want the system to flag when a new instruction may be outside a barrister's stated practice areas or experience level, so that I can support BSB Core Duty 7 (competent standard of service). | Low |

### Barrister-Side Stories

| ID | User Story | Risk |
|----|-----------|------|
| B1.1 | As a **Barrister**, I want to receive a structured summary of a proposed new instruction (case type, court, dates, estimated prep time, proposed fee range) via my preferred channel (app notification, email, or messaging), so that I can make an informed accept/decline decision quickly — even during a court break. | Low |
| B1.2 | As a **Barrister**, I want to flag personal conflicts or concerns about an instruction with a single action (not a phone call), so that the clerk receives my position asynchronously without me needing to leave court. | **High** |
| B1.3 | As a **Barrister**, I want to see how many instructions I've received this quarter broken down by case type, so that I can monitor whether my practice is developing in the direction I've agreed with my clerk. | Low |
| B1.4 | As a **Barrister**, I want the system to alert me if an instruction arrives that matches a practice area I've flagged as a development target, so that I don't miss growth opportunities while busy with existing cases. | Low |

---

## Phase 2: Diary & Scheduling

### Clerk-Side Stories

| ID | User Story | Risk |
|----|-----------|------|
| C2.1 | As a **Practice Manager**, I want the system to automatically calculate and block preparation time in the diary when a hearing is booked, based on case type and complexity, so that barristers aren't double-booked during prep windows. | **High** |
| C2.2 | As a **Junior Clerk**, I want to see a real-time clash detection view across all barristers' diaries, so that I can spot conflicts before they become urgent returns. | Low |
| C2.3 | As a **Senior Clerk**, I want the system to suggest alternative counsel from within chambers when a clash is detected, ranked by suitability and availability, so that I can manage returns quickly. | Low |
| C2.4 | As a **Practice Manager**, I want the system to sync diary entries bidirectionally between our CMS (LEX/MLC/BarBooks) and barristers' personal Outlook calendars, so that we eliminate double-entry and reduce sync drift. | **High** |
| C2.5 | As a **Practice Manager**, I want the system to surface court listing changes (where available) and flag impacts on booked hearings, so that I can proactively manage the diary rather than react to last-minute surprises. | Low |
| C2.6 | As a **Practice Manager**, I want the system to flag when a barrister has back-to-back hearings at different locations and the travel time between them is tight, so that I can proactively manage the diary or arrange a return. | Low |
| C2.7 | As a **Junior Clerk**, I want to pull up the court knowledge file for any venue when a barrister asks me about logistics, so that I can give accurate practical advice without relying solely on memory. | Low |

### Barrister-Side Stories

| ID | User Story | Risk |
|----|-----------|------|
| B2.1 | As a **Barrister**, I want to mark blocks in my diary as "firm unavailability" (caring responsibilities, medical, personal) without disclosing the reason to the clerks' room, so that my boundaries are respected without requiring me to justify them. The system displays "unavailable — firm" to clerks. Chambers can optionally configure Senior Clerk visibility into the reason, but this is off by default. | **High** |
| B2.2 | As a **Barrister**, I want the system to show me my upcoming commitments with automatically estimated prep time highlighted, so that I can see whether my workload is realistic before accepting new work. | Low |
| B2.3 | As a **Barrister**, I want to receive a priority-ranked notification queue of diary-related queries from my clerk that I can action with a tap (confirm/decline/defer), so that I can respond during short court breaks without typing lengthy replies. | **High** |
| B2.4 | As a **Barrister**, I want the system to warn me if accepting a new booking would push my workload above a threshold I've personally set, so that I can make over-commitment visible to myself before the "fear factor" kicks in. | Low |
| B2.5 | As a **Barrister**, I want to ask the system "how do I get to [court]" and receive travel instructions, estimated journey time, and practical tips about the building, so that I can arrive prepared and on time — especially at venues I haven't visited before. | Low |
| B2.6 | As a **Barrister**, I want to contribute tips about a court or tribunal building I've just visited (e.g. "the robing room has moved to the 2nd floor"), so that colleagues benefit from up-to-date local knowledge. Contributions are submitted as pull requests and reviewed before merging into the knowledge base. | **High** |

---

## Phase 3: Case Lifecycle Management

### Clerk-Side Stories

| ID | User Story | Risk |
|----|-----------|------|
| C3.1 | As a **Practice Manager**, I want the system to track matter status across a defined lifecycle (instructed → papers received → prep in progress → hearing → post-hearing → closed), so that I can give solicitors accurate progress updates without chasing the barrister each time. | Low |
| C3.2 | As a **Junior Clerk**, I want the system to flag when expected papers from a solicitor haven't arrived by a set deadline, so that I can chase proactively rather than discovering gaps the night before a hearing. | Low |
| C3.3 | As a **Practice Manager**, I want the system to generate a structured handover summary when a return is triggered (case type, key dates, documents received, outstanding issues, solicitor contact), so that replacement counsel and their clerk can get up to speed quickly. | **High** |
| C3.4 | As a **Senior Clerk**, I want a chambers-wide view of all active matters by stage, barrister, and court, so that I can spot bottlenecks and resource pressure before they become emergencies. | Low |
| C3.5 | As a **Practice Manager**, I want the system to prompt me to update the solicitor when a hearing outcome is recorded, with a draft communication I can review and send, so that client communication is timely without me drafting from scratch. | **High** |

### Barrister-Side Stories

| ID | User Story | Risk |
|----|-----------|------|
| B3.1 | As a **Barrister**, I want to update the status of my matters with minimal friction (e.g. "hearing complete — reserved judgment" via a quick-action menu or single message to the system), so that my clerk has current information without me writing a formal email. | **High** |
| B3.2 | As a **Barrister**, I want the system to present a preparation checklist for each upcoming hearing based on case type (e.g. "skeleton argument due?", "bundle paginated?", "authorities agreed?"), so that I have a structured prompt for what needs doing rather than relying on memory. | Low |
| B3.3 | As a **Barrister**, I want any AI-generated summary of my case documents (e.g. brief summary, key dates extraction) to be clearly marked as AI-generated and to include a mandatory verification step before it can be shared or relied upon, so that I comply with Bar Council AI guidance on human oversight. | **High** |
| B3.4 | As a **Barrister**, I want to see a timeline view of each of my active matters showing key past events and upcoming deadlines, so that I can manage my own caseload without asking the clerks' room for a status update. | Low |
| B3.5 | As a **Barrister** receiving a returned brief, I want to see the handover summary (C3.3) along with the court knowledge file for the venue and estimated prep time, so that I can make an informed decision about whether to accept the return. | Low |
| B3.6 | As a **Barrister**, I want the system to automatically verify any statutory or caselaw citation in an AI-generated output against the i.AI Lex database before I can rely on it, so that I have confidence the AI hasn't fabricated authorities. | Low |

---

## Phase 4: Fee & Billing

### Clerk-Side Stories

| ID | User Story | Risk |
|----|-----------|------|
| C4.1 | As a **Fees Clerk**, I want the system to auto-generate a draft fee note from the recorded work, agreed terms, and hearing dates on a matter, so that I can review and send invoices faster rather than compiling them manually. | **High** |
| C4.2 | As a **Fees Clerk**, I want a real-time aged debt dashboard showing all outstanding invoices by solicitor, age band, and barrister, so that I can prioritise chasing without running manual reports. | Low |
| C4.3 | As a **Senior Clerk**, I want the system to flag solicitors with a pattern of late payment when a new instruction arrives from them, so that I can factor payment reliability into fee negotiation. | Low |
| C4.4 | As a **Practice Manager**, I want the system to suggest a fee quote range for a new instruction based on historical data (case type, court, seniority, solicitor), so that I have a data-informed starting point for negotiation rather than relying solely on instinct. | Low |
| C4.5 | As a **Senior Clerk**, I want the system to produce chambers-wide financial performance reports (revenue by practice area, barrister, quarter) for management committee meetings, so that governance has accurate data without manual spreadsheet work. | Low |

### Barrister-Side Stories

| ID | User Story | Risk |
|----|-----------|------|
| B4.1 | As a **Barrister**, I want to see my own earnings, outstanding fees, and aged debt in a personal financial dashboard, so that I understand my practice's financial health without having to ask my clerk informally. | Low |
| B4.2 | As a **Barrister**, I want to record time spent on a matter through a lightweight interface (timer, quick log, or voice note transcribed to time entry), so that fee notes accurately reflect work done without me maintaining a separate manual log. | **High** |
| B4.3 | As a **Barrister**, I want to review and approve a draft fee note before it's sent to the solicitor, so that I can catch errors and ensure the invoice reflects the actual work. | **High** |
| B4.4 | As a **Barrister**, I want the system to alert me when a fee note has been paid or when a payment is significantly overdue, so that I have passive visibility into my cash flow without monitoring it actively. | Low |
| B4.5 | As a **Barrister**, I want to see how my fees compare to anonymised chambers benchmarks for similar case types and seniority bands, so that I can have an informed conversation with my clerk about fee levels at my next practice review. This feature is controlled by the Senior Clerk — chambers can enable or disable barrister access to benchmarks. | Low |

---

## Phase 5: Communication

### Clerk-Side Stories

| ID | User Story | Risk |
|----|-----------|------|
| C5.1 | As a **Practice Manager**, I want a unified matter-linked communication trail that pulls together emails, messages, and notes relating to a case into a single chronological view, so that I can see the full picture without searching across Outlook, Teams, and the CMS separately. | Low |
| C5.2 | As a **Junior Clerk**, I want the system to generate a short "instant-view" summary of a new instruction or availability query that a barrister can action from a notification, so that barristers in court can respond during a short break. | Low |
| C5.3 | As a **Practice Manager**, I want the system to draft routine solicitor communications (booking confirmations, listing updates, availability responses) that I can review and send, so that I spend less time on templated correspondence. | **High** |
| C5.4 | As a **Senior Clerk**, I want to broadcast an announcement to all barristers (or a filtered group) through their preferred channel, so that chambers-wide updates reach everyone without me managing multiple distribution lists. | **High** |
| C5.5 | As a **Practice Manager**, I want the system to queue non-urgent requests to barristers and deliver them in batched digests at configurable times, so that barristers aren't interrupted by low-priority notifications during hearings or prep time. | Low |

### Barrister-Side Stories

| ID | User Story | Risk |
|----|-----------|------|
| B5.1 | As a **Barrister**, I want to choose my preferred communication channel for clerk notifications (app, email, WhatsApp, Signal, SMS) and set quiet hours, so that I control when and how the system reaches me. | Low |
| B5.2 | As a **Barrister**, I want to respond to clerk queries with structured quick actions (accept/decline/request more info) rather than composing free-text replies, so that I can action things from my phone in 30 seconds between hearings. | **High** |
| B5.3 | As a **Barrister**, I want a single view of all pending items requiring my attention (instructions to accept, fee notes to approve, diary queries to answer), so that nothing falls through the cracks when I'm busy in court. | Low |
| B5.4 | As a **Barrister**, I want the system to clearly distinguish between messages from my clerk, messages from solicitors relayed by my clerk, and system-generated notifications, so that I can prioritise appropriately. | Low |
| B5.5 | As a **Barrister**, I want any AI-drafted communication that will go out in my name to require my explicit approval, with the AI draft clearly marked, so that I maintain professional responsibility over what's sent. By default, outbound comms require both clerk and barrister approval (double-step). Chambers can configure this down to single-step where appropriate. | **High** |

---

## Phase 6: Practice Review & Development

### Clerk-Side Stories

| ID | User Story | Risk |
|----|-----------|------|
| C6.1 | As a **Senior Clerk**, I want the system to generate a pre-populated practice review pack for each barrister (work mix, fee trends, instruction volume, client feedback, comparison to agreed targets), so that reviews are grounded in data rather than anecdotal recall. | Low |
| C6.2 | As a **Senior Clerk**, I want to schedule and track practice reviews across all barristers with reminders, so that reviews actually happen at the agreed frequency rather than being perpetually deferred. | Low |
| C6.3 | As a **Practice Manager**, I want to record action points from a practice review (e.g. "target more commercial work", "increase fees by 10% on new instructions", "reduce travel radius") and have the system surface them during relevant future workflows, so that review outcomes translate into operational changes rather than sitting in a forgotten document. | **High** |
| C6.4 | As a **Senior Clerk**, I want a chambers-wide view of work distribution by protected characteristic (gender, ethnicity, disability — as reported to BSB), alongside the allocation reasoning logs from C1.4, so that I can prepare fair access reports for management committee and BSB compliance. | Low |
| C6.5 | As a **Practice Director**, I want the system to flag barristers who haven't had a practice review in the last 12 months, so that I can ensure nobody falls through the gaps — particularly junior tenants and those in the first few years of practice. | Low |

### Barrister-Side Stories

| ID | User Story | Risk |
|----|-----------|------|
| B6.1 | As a **Barrister**, I want to see my own practice review data before the review meeting (the same pack my clerk sees at C6.1, minus any chambers-wide comparative data that the Senior Clerk hasn't enabled), so that I can prepare and the conversation is a genuine dialogue rather than an information dump. | Low |
| B6.2 | As a **Barrister**, I want to log my own development goals, wellbeing notes, and practice preferences privately within the system, so that I can choose what to raise in my review rather than having the clerk set the entire agenda. | Low |
| B6.3 | As a **Barrister**, I want to see a trend view of my practice over time (earnings trajectory, case type mix shift, instruction volume by quarter), so that I can assess whether my career is moving in the direction I want. | Low |
| B6.4 | As a **Barrister**, I want the system to remind me of action points agreed at my last practice review and show progress against them, so that reviews feel cumulative rather than starting from scratch each time. | Low |
| B6.5 | As a **Barrister**, I want the option to flag a wellbeing concern through the system (e.g. "I'm struggling with workload" or "I need to reduce my caseload temporarily") that reaches my Senior Clerk or a designated wellbeing contact, so that I can raise issues without the barrier of an in-person conversation. The barrister initiates this; the system never infers or auto-flags wellbeing concerns. The barrister sees exactly who will receive the message and confirms before sending. | **High** |

---

## Story Summary

| Phase | Clerk stories | Barrister stories | Total |
|-------|:---:|:---:|:---:|
| 1. Instruction Intake & Conflict Checking | 5 | 4 | 9 |
| 2. Diary & Scheduling | 7 | 6 | 13 |
| 3. Case Lifecycle Management | 5 | 6 | 11 |
| 4. Fee & Billing | 5 | 5 | 10 |
| 5. Communication | 5 | 5 | 10 |
| 6. Practice Review & Development | 5 | 5 | 10 |
| **Total** | **32** | **31** | **63** |

---

## Open Questions (Preserved from Research Synthesis)

These questions emerged from the research reports and were not resolved during the co-design session. They are preserved here as future design inputs.

1. **Micro-workflows for high-value brief allocation** — Local chambers constitutions govern these and are not publicly documented. How should the system handle allocation logic it cannot observe?
2. **Squatters / probationary barristers** — No published guidance on clerking support for barristers on trial periods. Should CoClerk include a provisional user role?
3. **Discriminatory instruction handling** — The clerk-barrister interaction when a discriminatory instruction is received has no standard procedural model. Should CoClerk include a workflow for this?
4. **Court listing API integration** — All research reports note inconsistent integration between chambers software and court listing systems. No documented APIs or data formats were found. Flagged as a research spike.
5. **Employed Bar** — All three research reports scope this out. CoClerk v1 targets the self-employed Bar. Employed Bar support is deferred.

---

## Research Basis

This specification was derived from synthesis of three independent research reports on the barrister-clerk operational relationship in England and Wales (2020–2025), drawing on:

- Bar Standards Board (BSB) Handbook and regulatory guidance
- Institute of Barristers' Clerks (IBC) Code of Conduct
- Bar Council practice guides (Starting at the Bar, Practice Review Guide, Building and Managing Your Practice A–Z)
- BSB Technology and Innovation at the Bar research report (March 2025)
- Chambers management software documentation (Opus 2 LEX, Advanced MLC, BarBooks)
- Bar Council remote justice reports (2020–2024)

Where the specification makes design choices that go beyond what the research documented, these are flagged as assumptions within the relevant user story or in the Open Questions section above.
