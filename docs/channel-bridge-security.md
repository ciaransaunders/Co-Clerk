# Security Architecture & Threat Model: Channel Bridge

## 1. Overview
The Channel Bridge is the gateway component of CoClerk that enables integration with third-party messaging platforms (WhatsApp, Signal, SMS). Its primary goal is to provide barristers with a "30-second interaction" window for triage and updates while protecting privileged case data.

## 2. Security Architecture

### Isolation
- The Channel Bridge service must run as a separate process or container with its own isolated credentials.
- It has **no direct access** to the main CoClerk database. It communicates exclusively via the API Gateway using signed JWE (JSON Web Encryption) tokens.
- All outbound messages are fetched from a secure queue after being processed by the Redaction Engine.

### Data Protection
- **Pre-Redaction**: Every message containing case data must pass through the Redaction Engine (B1) before reaching the Channel Bridge.
- **TLS Termination**: All API-to-Bridge communication is encrypted via TLS 1.3.
- **Message Content**: Only "Lower Risk" (Tier Low) summaries are ever sent automatically. "High Risk" notifications (e.g., fee approvals) contain only a link to the secure Web UI, never the financial data itself.

## 3. Threat Model (STRIDE)

| Threat | Category | Mitigation |
|--------|----------|------------|
| **Impersonation** | Spoofing | Barristers must perform a "One-Time Link" (OTL) pairing between their CoClerk Web UI session and their messaging app identity. |
| **Data Leak** | Information Disclosure | Mandatory redaction of PII. No historical case data is pullable via the bridge (Inbound is strictly command-based, e.g., `/diary`). |
| **Unauthorized Action** | Tampering | Every incoming command is validated against the user's role and capability (A11). A /triage_accept command requires a valid correlation ID for a pending request. |
| **LLM Runaway** | Repudiation | **Human-in-the-loop (HITL)**: Direct automated messaging to external solicitors is physically disabled in the code. AI-generated drafts must be approved in the Web UI. |
| **API Exhaustion** | Denial of Service | Rate limiting per user and per chambers. |

## 4. Human-In-The-Loop (HITL) Policy
To maintain professional responsibility and prevent hallucinations or prompt injection from reaching the client (solicitor), the following rules apply:

1. **Internal Comms**: System-to-Barrister is permissible for notifications and alerts.
2. **External Comms**: System-to-Solicitor is **DISABLED**.
3. **Workflow**: 
    - AI generates a draft.
    - Clerk/Barrister reviews draft in the Web UI.
    - Human clicks "Send".
    - System pushes message to external channel of choice.

## 5. Token Handling
- Mobile tokens (for Push Notifications) and Bridge-linked IDs (Signal/WhatsApp Numbers) are stored as irreversible cryptographic hashes in the user's profile.
- Correlation IDs for ephemeral interactions (e.g., triage responses) expire after 1 hour.
