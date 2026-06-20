# ADR 0004: Phase 4 UX Architecture

## Status
Accepted

## Context
Phase 4 required laying the visual systems and user interfaces for both Clerks (Desktop prioritization) and Barristers (Mobile-first triage). The workflow had to explicitly emphasize multi-party workflows, avoiding "magic" automated assumptions by emphasizing human-oversight boundary lines with distinct visual labels.

## Decision
- Instead of using a heavyweight component library, a lightweight `packages/ui` CSS module was implemented specifying `--c-` tokens guaranteeing distinct and accessible contrasts.
- Barrister "30-second interactions" were built around rapid-firing action cards for pending Notifications routing immediately into the backend `accept / decline / concern` hooks.
- Clerk Dashboard prominently flags entries utilizing `mock-deterministic` provider summaries with a specific `✨ AI` badge, cleanly separating computed outputs from human verification queues. 

## Consequences
- The system is instantly usable, rendering the true phase 3 API outputs.
- Because Create React App (CRA) environments generally demand independent process booting, we bypass full automated CI UI testing unless the `.nvmrc` constraints are locally enforced.
