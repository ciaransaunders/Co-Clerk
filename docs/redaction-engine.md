# Technical Specification: Redaction Engine

## 1. Overview
The Redaction Engine is a core security component of CoClerk responsible for ensuring "Data Sovereignty." It identifies, masks, and optionally de-redacts PII (Personally Identifiable Information) and PHI (Protected Health Information) before data is transmitted to cloud-based Large Language Models (LLMs).

## 2. Redaction Levels
Based on `ARCHITECTURE.md` §2.2, the engine implements four levels of redaction:

| Level | Strategy | Target Entities |
|-------|----------|-----------------|
| **Maximum** | Full Masking | Names, addresses, DOBs, case numbers, court refs, locations, roles. |
| **Moderate** | Context-Preserving | Names, addresses, locations (replaced with categorized tokens). |
| **Minimum** | Selective Masking | Contact details (emails, phone numbers) only. |
| **None** | No Change | Direct pass-through (used only for local Ollama models). |

## 3. Entity Recognition Strategy
The engine uses a hybrid approach for detection:

- **Rule-Based (Regex)**: For highly structured data (Postcodes, Case Numbers, URLs, Emails, Phone Numbers).
- **Named Entity Recognition (NER)**: For unstructured text (Person names, Organizations, Locations).
- **Secondary QA Pass**: Outbound prompts are scanned by a light-weight regex filter to catch any "leaked" patterns (e.g., standard UK phone patterns) before network transmission.

## 4. Reversible Tokenization
To ensure LLM responses remain useful, the engine uses **reversible tokenization** for Maximum and Moderate levels.

### Token Format
Tokens are unique within a session and preserve role context:
- `[PERSON_1]`
- `[PERSON_2]`
- `[LOCATION_A]`
- `[CASE_REF_1]`

### Token Lookup Table (TLT)
A short-lived, secure lookup table is maintained:
1. **Redact**: Text `Jane Doe` -> Token `[PERSON_1]`. Store `{ "[PERSON_1]": "Jane Doe" }` in TLT.
2. **LLM Process**: LLM receives and uses `[PERSON_1]`.
3. **De-redact**: LLM returns "Advise [PERSON_1] to...". Engine swaps `[PERSON_1]` back to `Jane Doe`.

### TLT Retention
TLT data is transient:
- Persisted in memory or encrypted cache (Redis).
- Automatically purged after 24 hours or upon Matter completion.
- Never persisted to long-term storage or audit logs.

## 5. Failure Modes & Safety
- **Uncertainty Handling**: If the NER confidence is below a configurable threshold (default 0.7), the engine defaults to masking the entire sentence or the specific entity greedily.
- **Fail-Closed**: If the Redaction Engine is unreachable or errors, the prompt transmission to cloud LLMs is blocked.
- **Audit Trails**: Redaction events are logged (count of redacted items, level applied) without storing the redacted values themselves.

## 6. Implementation Stages
1. **Stage 1 (Mock)**: Deterministic replacement based on simple regex.
2. **Stage 2 (Local)**: Integration with `presidio` or `spacy` running on chambers infrastructure.
3. **Stage 3 (Managed)**: Cloud-native PII detection services (optional fallback).
