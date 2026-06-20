# CoClerk Demo Walkthrough

This document outlines the end-to-end user journey for the "Intake-to-Approval" workflow. This demo exercises the monorepo's shared domain logic, the Drizzle-backed PostgreSQL database, real JWT authentication, and the React-based clerk and barrister interfaces.

## 1. Setup & Bootstrap

1. **Reset Database**: Ensure a clean state.
   ```bash
   pnpm db:migrate && pnpm db:seed
   ```
2. **Start Services**:
   ```bash
   pnpm dev
   ```
   *This starts the API (4000), Clerk Desktop (3000), and Barrister Mobile (3001).*

---

## 2. The Persona Swapping Journey

### Step A: Clerk Intake Review
1. Open **Clerk Desktop** (`http://localhost:3000`).
2. **Login**: Click **"Dev Clerk"** in the Quick Access panel.
3. **Dashboard**: Observe the "Incoming Instructions" list populated from the seed (e.g., *Smith v MegaCorp*).
4. **Identify AI Support**: Note the `✨ AI Extraction` badge showing parsed court, case type, and confidence scores.
5. **Conflict Check**: Note the `Conflict: CLEAR` badge, indicating the conflict engine verified the new instruction against existing matters.
6. **Simulate New Intake**: Click **"Simulate Inbound Setup"**. This triggers the API to "receive" a new email instruction, run the AI parser, run a conflict check, and rank allocation candidates (Jane Doe, John Smith).

### Step B: Barrister Action
1. Open **Barrister Mobile** (`http://localhost:3001`).
2. **Login**: Click **"Jane Doe"** in the Quick Access panel.
3. **Inbox**: See the personal notification for the new instruction (e.g., *New Instruction: Smith v MegaCorp*).
4. **Respond**: Tap **"Accept Allocation"**.
5. **Behind the scenes**: This records the response and, since it's a high-risk matter, triggers an **Approval Request** for the Senior Clerk.

### Step C: Senior Clerk Approval
1. Switch back to the **Clerk Desktop** browser tab.
2. Navigate to **"Action Queue"** or **"Approvals"**.
3. Observe the pending request: *Allocation Decision Approval*.
4. **Finalise**: Click **"Approve Mutation"**.
5. **The Mutation**: The system now moves the matter to `instructed` status and creates a hearing/prep block in Jane Doe's diary automatically.

### Step D: Verification
1. Navigate to the **Matter List** (coming soon) or check the API state:
   ```bash
   curl http://localhost:4000/api/v1/workflow/state/inspect
   ```
2. Verify that **Smith v MegaCorp** is now `instructed` and assigned to **Jane Doe**.

---

## Technical Features Exercised
- **Identity**: JWT signing/verification and role-based capability checks (PD vs PM vs Barrister).
- **Workflow**: The custom Gatekeeper pattern (202 Accepted → Approval Queue → Mutate).
- **Redaction**: Mocking check for LPP-sensitive data during parsing.
- **Persistence**: Full relational integrity across PostgreSQL tables.
