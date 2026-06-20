# CoClerk

An open-source AI interface for barristers' chambers in England and Wales.

CoClerk sits alongside existing chambers management software (Opus 2 LEX, Advanced MLC, BarBooks) as an intelligent augmentation layer — serving **both barristers and clerks equally** with workflow support, transparent practice data, and AI-assisted automation with mandatory human oversight.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Why CoClerk?

The operational relationship between barristers and clerks is built on a persistent **information asymmetry**: clerks hold chambers-wide data (diaries, fees, solicitor relationships, work pipeline) while barristers hold deep case-specific knowledge and personal capacity information. This asymmetry drives most of the friction in chambers — from opaque work allocation to over-commitment, from billing delays to the documented "fear factor" that prevents barristers from setting boundaries.

CoClerk bridges this gap by giving both sides appropriate visibility into the data they need, while respecting the professional boundaries that make the relationship work.

### What CoClerk Is

- A **self-hosted** application that keeps all data on chambers-controlled infrastructure
- A **model-agnostic** AI layer supporting Claude, GPT, Gemini, and local models
- A **CMS companion** that syncs with LEX, MLC, and BarBooks — not a replacement
- A **regulatory-aware** system designed around BSB, IBC, and Bar Council guidance
- A **dual-persona** interface with equal design weight for barristers and clerks

### What CoClerk Is Not

- Not an autonomous agent with system access (unlike OpenClaw)
- Not a replacement for chambers management software
- Not legal advice software — it supports practice management, not case strategy
- Not a tool that acts without human confirmation on sensitive matters

---

## Key Features

### For Clerks
- **Instruction triage** with automated conflict checking and counsel matching
- **Chambers-wide diary** with real-time clash detection and return suggestions
- **Fair access monitoring** with auditable work allocation reasoning logs (BSB rC110)
- **Aged debt dashboard** and automated draft fee notes
- **Practice review packs** pre-populated with data
- **AI-drafted routine correspondence** with review-before-send

### For Barristers
- **30-second court break interactions** — accept/decline instructions with a tap
- **Personal dashboards** — earnings, caseload, practice trends, aged debt
- **Opaque firm unavailability** — block diary time without disclosing reasons
- **Court travel assistant** — navigation, journey times, and community-sourced building tips
- **AI output verification** — mandatory review gate on all AI-generated case content
- **Citation verification** — statutory and caselaw citations checked against i.AI Lex
- **Wellbeing flagging** — raise concerns confidentially, on your terms

### For Chambers
- **EDI reporting** across work distribution by protected characteristics
- **Configurable permissions** — adjust visibility, approval steps, and features per chambers
- **Audit trail** on every high-risk action — editable records with full version history
- **Community court knowledge base** — growing markdown files for every court and tribunal in England and Wales

---

## Architecture

**Hybrid deployment:** self-hosted core with optional cloud LLM layer.

```
Chambers Network (self-hosted)
├── Web UI (clerk desktop)
├── Mobile UI (barrister PWA)
├── Channel Bridge (WhatsApp, Signal, Email, SMS)
├── API Gateway + Permission Engine (6-tier RBAC)
├── Workflow Engine (6 phase modules)
├── Data Layer (PostgreSQL)
├── CMS Adapter Layer (LEX / MLC / BarBooks / CSV / Standalone)
└── MCP Plugin Host
    ├── Maps (Google/Apple Maps)
    ├── Court Knowledge Base
    ├── Document Analysis
    └── i.AI Lex (UK legislation API)

Cloud (optional)
└── LLM Provider Abstraction
    ├── Anthropic Claude
    ├── OpenAI GPT
    ├── Google Gemini
    └── Local (Ollama)
```

Full architecture: [ARCHITECTURE.md](ARCHITECTURE.md)  
Feature specification (63 user stories): [FEATURE_SPEC.md](FEATURE_SPEC.md)

---

## Court Knowledge Base

CoClerk includes a community-maintained knowledge base of court and tribunal buildings across England and Wales. Each file covers practical information barristers actually need: how to get there, what security is like, where to find the robing room, accessibility information, and local tips from colleagues who've recently attended.

Barristers travelling to unfamiliar venues — especially large complexes like the Royal Courts of Justice — can ask CoClerk for travel instructions and building tips, and the system combines the knowledge base with live mapping data to give practical, contextual guidance.

**Contributing:** See [courts/README.md](courts/README.md) for the template and contribution guide. Every barrister who visits a court can improve the knowledge base for the next person.

---

## Design Rationale: Opaque Firm Unavailability (B2.1)

One feature deserves specific explanation because it deliberately creates an information asymmetry in the barrister's favour.

Barristers can mark diary blocks as "firm unavailability" without disclosing the reason. The clerk sees "unavailable — firm" but not whether it's a medical appointment, a school run, or a mental health day.

**Why this is the default:** Research across multiple sources documents a persistent "fear factor" at the Bar — barristers, especially women with caring responsibilities, over-commit to work because they fear that declining will lead to being sidelined by the clerks' room. This contributes directly to the high rates of mental health difficulty reported across the profession. The existing asymmetry (clerk sees everything, barrister has no privacy over their time) reinforces this problem.

CoClerk's default protects the barrister's boundaries. Chambers that prefer transparency can enable Senior Clerk visibility into reasons via a configurable setting — but the safe default is opaque.

---

## Getting Started

> ⚠️ CoClerk is in early development. The feature specification and architecture are complete; implementation is in progress.

```bash
# Clone the repository
git clone https://github.com/ciaransaunders/coclerk.git
cd coclerk

# [Further setup instructions will be added as implementation progresses]
```

---

## Contributing

CoClerk welcomes contributions from barristers, clerks, legal technologists, and developers.

**Especially welcome:**
- Court knowledge base entries (you visited a court? Write up what you learned)
- CMS adapter development (particularly if you have access to LEX/MLC/BarBooks)
- MCP plugin development
- Bug reports and feature requests
- Feedback from practising barristers and clerks on the user stories

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## Licence

MIT — see [LICENSE](LICENSE) for details.

---

## Acknowledgements

CoClerk's design is grounded in research across Bar Standards Board publications, Institute of Barristers' Clerks guidance, Bar Council practice management resources, and the BSB Technology and Innovation at the Bar report (2025). The i.AI Lex integration uses the UK government's open legislation API built by the Incubator for AI with support from The National Archives and Ministry of Justice.

This project is not affiliated with or endorsed by the BSB, IBC, Bar Council, or any chambers.
