# ADR 0001: Phase 1 Monorepo Structure

## Status
Accepted

## Context
CoClerk requires a codebase structure that supports separate deployables (clerk desk, barrister mobile, API gateway, background workers) while sharing domain logic, database schemas, and configuration. The local environment must be self-hostable but easily verifiable. The target environment may or may not support standard Node tooling immediately.

## Decision
We have adopted a standard **PNPM Workspace** (monorepo) with the following structure:
- `apps/*`: Runnable micro-services and frontends (api, worker, web-clerk, web-barrister).
- `packages/*`: Shared internal primitives (domain, database, workflow-engine).

We use **TypeScript** across the stack for unified domain modeling (e.g. sharing `Role` and `RiskTier` data types between API and React UIs).

We opted for **PostgreSQL** configured via `docker-compose.yml` for isolated data modeling and migrations.

## Consequences
- Requires a current Node.js and PNPM toolchain to run. If not available natively on the deployment server, it restricts out-of-the-box execution until a build container is provided.
- Allows rapid API/UI co-development by importing `@coclerk/domain` directly.
- The `packages/database` schema can remain manually versioned SQL files initially until an ORM layer (like Prisma or TypeORM) is strictly needed by Phase 2.
