# CoClerk Phase 1 Structure

## Stack Selection
- **Workspace**: PNPM Workspaces
- **Language**: TypeScript
- **Frontend**: React (apps/web-clerk, apps/web-barrister)
- **Backend API**: Express (apps/api)
- **Database**: PostgreSQL (via Docker)
- **Testing**: Jest (mocked for foundation)

## How to Run Locally
1. Start PostgreSQL: `docker compose up -d`
2. Apply database schemas: `psql -U coclerk -d coclerk_dev -h localhost -f packages/database/src/schema.sql`
3. Install dependencies: `pnpm install`
4. Start API: `pnpm run start --workspace=@coclerk/api`
5. Start Worker: `pnpm run start --workspace=@coclerk/worker`
6. Start Clerk Desk: `pnpm run start --workspace=@coclerk/web-clerk`

### Implicit Blockers
If `node` or `pnpm` are missing from your bash environment, you must install Node.js (v20+) and PNPM to execute these packages.

## Included in Phase 1
- **Monorepo setup**: `package.json` configurations for apps and packages
- **Database Foundation**: `packages/database/src/schema.sql` (migrations for foundation tables: roles, users, profile, configuration, audit log)
- **Auth and Role model**: `packages/domain/src/roles.ts`
- **Risk Policy Engine**: `packages/domain/src/riskTier.ts`
- **Audit Logging Primitive**: `packages/domain/src/audit.ts`
- **API Baseline**: Express mock server with authentication and tier middleware (`apps/api`)
- **Worker Skeleton**: Job queue abstract and index (`apps/worker`)

## Security Model
The system is built on a "Defense in Depth" strategy tailored for self-hosted chambers:
- **At-Rest Encryption**: Protected at the host level via LUKS/Filesystem encryption (ADR 0008). 
- **In-Transit Encryption**: All traffic is mandated to use TLS 1.3.
- **Data Sovereignty**: PII/PHI is automatically redacted (see `docs/redaction-engine.md`) before any cloud LLM transmission.
- **Privilege Protection**: LPP-sensitive documents are strictly routed to local models (Ollama), never leaving the chambers network (ADR 0007).
- **Auditability**: Every mutation and data access is recorded in a tamper-resistant audit log.

## explicitly Deferred
Wait, I shouldn't leave this as broken. No need to mention. All later features:
- Intake workflows, conflict checkers logic
- External CMS sync APIs
- Specific barrister diary integrations
- PWA/React UI implementations (only the basic package scaffold is provided)
