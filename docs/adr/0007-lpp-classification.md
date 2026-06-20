# ADR 0007: LPP Classification & Local-Only Processing

## Status
Accepted

## Context
Legal Professional Privilege (LPP) is a fundamental legal principle in England and Wales. Communications between a lawyer and their client for the purpose of seeking or giving legal advice are privileged and must never be disclosed to third parties without the client's consent.

Sending LPP-protected documents to a cloud-based LLM provider (e.g., Anthropic, OpenAI), even with redaction, carries a material risk of being construed as a waiver of privilege. While redaction (see `docs/redaction-engine.md`) mitigates the risk of PII leakage, it does not address the fundamental issue of data disclosure to a third-party processor.

## Decision
We will implement an explicit **LPP Classification** model with a strict routing guardrail.

1. **Explicit Flag**: Every `Matter` and `InstructionIntake` will include an `LPP-Sensitive` boolean flag.
2. **Default State**: By default, the flag is `false`. It must be explicitly set to `true` by a clerk or barrister when privileged content is identified.
3. **Local-Only Guardrail**: Any matter flagged as `LPP-Sensitive` is **mathematically prohibited** from being sent to cloud LLM providers.
    - All associated prompts will be routed exclusively to local models (Ollama) running on chambers hardware.
    - The API Gateway will enforce this check at the routing layer.
4. **Visibility**: LPP-flagged matters will display a prominent "🔒 LPP PROTECTED - LOCAL PROCESSING ONLY" badge in the UI.

## Consequences
- **Compliance**: Ensures chambers meet their BSB Core Duty 6 (Confidentiality) and avoid inadvertent waiver of privilege.
- **UX Trade-off**: Local models may be less performant or accurate than cloud models for complex tasks. This is an acceptable trade-off for security.
- **Audit**: All routing decisions (Local vs. Cloud) will be logged in the audit trail, referencing the LPP status at the time of the call.
