# ADR 0006: Database Migration Tooling Selection

## Status
Accepted

## Context
The CoClerk monorepo initially used a collection of raw SQL files (`schema.sql` and numbered phase scripts) for database definition. While simple, this approach lacks formal version tracking, prevents type-safe schema queries in the application layer, and makes rollbacks or schema drift detection difficult.

We need a tool that:
1. Provides a single source of truth for the database schema.
2. Supports standard SQL migrations for cross-language compatibility.
3. Integrates deeply with our TypeScript domain model.
4. Operates efficiently within a monorepo.

## Decision
We will use **Drizzle ORM** and **Drizzle Kit** for database management.

### Why Drizzle?
- **TypeScript First**: Schemas are defined in TS, allowing us to share types directly with our domain packages.
- **SQL-First Migrations**: Drizzle Kit generates standard `.sql` files. This ensures that a Python-based worker or a Go-based scanner can understand the database structure by reading the transition files.
- **Lightweight**: Zero dependencies on heavy binaries (unlike Prisma's query engine), keeping the monorepo builds fast.
- **Developer Experience**: "Push" based development for local experimentation and "Migration" based deployment for production safety.

## Consequences
- **Schema Source of Truth**: `packages/database/src/schema.ts` becomes the definitive reference for the database.
- **Migration History**: All changes will be tracked in `packages/database/migrations/`.
- **Typing**: The `@coclerk/database` package will export table types that other packages can consume safely.
